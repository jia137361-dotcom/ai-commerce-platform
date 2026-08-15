import type { MedusaContainer } from "@medusajs/framework/types"
import { refundPaymentWorkflow } from "@medusajs/core-flows"
import { Modules } from "@medusajs/framework/utils"
import { BUYER_REFUND_REQUESTS_MODULE } from "../modules/buyer-refund-requests"
import { FULFILLMENT_ORDERS_MODULE } from "../modules/fulfillment-orders"
import type { BuyerRefundRequestRecord } from "./order-refund-request"
import type { CancellationContext, CancellationOrder } from "./order-cancellation"
import { evaluateRefundPolicy } from "./refund-policy"
import { resolveRefundPaymentContext } from "./refund-payment-context"
import { stripeApiRequest } from "./stripe-client"
import {
  ORDER_META_SELLER_PAYOUT_TRANSFER_ID,
} from "./order-custom-metadata"

type RefundRequestService = {
  listBuyerRefundRequests: (filters: Record<string, unknown>, config?: Record<string, unknown>) => Promise<BuyerRefundRequestRecord[]>
  updateBuyerRefundRequests: (input: Record<string, unknown>) => Promise<BuyerRefundRequestRecord[] | BuyerRefundRequestRecord>
}

type PaymentRecord = Record<string, unknown> & {
  id?: string
  refunds?: Array<Record<string, unknown>>
  data?: Record<string, unknown> | null
}

const numberValue = (value: unknown): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  if (value && typeof value === "object") {
    const candidate = value as { value?: unknown; numeric?: unknown }
    return numberValue(candidate.value ?? candidate.numeric)
  }
  return 0
}

const isIndeterminateProviderError = (error: unknown) =>
  /timeout|timed out|network|fetch|gateway|5\d\d|indeterminate|unknown/i.test(error instanceof Error ? error.message : String(error))

const updateRequest = async (service: RefundRequestService, id: string, patch: Record<string, unknown>) => {
  const result = await service.updateBuyerRefundRequests({ id, ...patch })
  return (Array.isArray(result) ? result[0] : result) as BuyerRefundRequestRecord
}

const loadRequest = async (
  service: RefundRequestService,
  input: { refundRequestId: string; orderId: string; storeId: string }
) => (await service.listBuyerRefundRequests({
  id: [input.refundRequestId],
  order_id: [input.orderId],
  store_id: [input.storeId],
}, { take: 1 }))[0]

const loadProductionContext = async (
  container: MedusaContainer,
  order: CancellationOrder
): Promise<CancellationContext> => {
  const fulfillmentService = container.resolve(FULFILLMENT_ORDERS_MODULE) as {
    listFulfillmentOrders: (filters: Record<string, unknown>) => Promise<CancellationContext["customFulfillmentOrders"]>
  }
  const customFulfillmentOrders = order.id
    ? await fulfillmentService.listFulfillmentOrders({ order_id: [order.id] })
    : []
  return {
    order,
    paymentStateResolved: Object.prototype.hasOwnProperty.call(order, "payment_collections"),
    fulfillmentStateResolved: Object.prototype.hasOwnProperty.call(order, "fulfillments"),
    customFulfillmentOrders,
  }
}

const providerRefundState = (payment: PaymentRecord, providerId: string) => {
  // Stripe's Medusa provider persists a completed refund record directly.
  // PayPal additionally exposes its provider-side asynchronous status here.
  if (providerId !== "pp_paypal_paypal") return "completed"
  const status = String(payment.data?.paypal_refund_status ?? "").toUpperCase()
  if (status === "PENDING") return "pending"
  if (["FAILED", "DENIED", "CANCELLED", "CANCELED"].includes(status)) return "failed"
  return "completed"
}

const executeStripeRefund = async (input: {
  container: MedusaContainer
  paymentIntentId: string
  amount: number
  refundRequestId: string
  orderId: string
}) => {
  const refund = await stripeApiRequest<{ id?: string; status?: string }>("/refunds", {
    method: "POST",
    idempotencyKey: `refund-request:${input.refundRequestId}`,
    params: { payment_intent: input.paymentIntentId, amount: input.amount },
  })
  if (!refund.id) throw new Error("Stripe did not return a refund ID")

  const orderModule = input.container.resolve(Modules.ORDER) as {
    retrieveOrder: (id: string) => Promise<{ metadata?: Record<string, unknown> | null }>
  }
  const order = await orderModule.retrieveOrder(input.orderId)
  const transferId = order.metadata?.[ORDER_META_SELLER_PAYOUT_TRANSFER_ID]
  if (typeof transferId === "string" && transferId.startsWith("tr_")) {
    await stripeApiRequest(`/transfers/${transferId}/reversals`, {
      method: "POST",
      idempotencyKey: `refund-transfer-reversal:${input.refundRequestId}`,
      params: { amount: input.amount },
    })
  }
  return refund
}

export async function executeApprovedRefund(input: {
  container: MedusaContainer
  refundRequestId: string
  orderId: string
  storeId: string
  amount: number
  createdBy?: string | null
  note?: string | null
}): Promise<BuyerRefundRequestRecord> {
  const lockingModule = input.container.resolve(Modules.LOCKING) as {
    execute: <T>(key: string, job: () => Promise<T>, args?: { timeout?: number }) => Promise<T>
  }

  return lockingModule.execute(`refund-request:${input.refundRequestId}`, async () => {
    const service = input.container.resolve(BUYER_REFUND_REQUESTS_MODULE) as RefundRequestService
    let request = await loadRequest(service, input)
    if (!request?.id) throw new Error("Refund request was not found")
    if (["refunded", "processed", "partially_refunded"].includes(String(request.status))) return request
    if (["refund_processing", "processing", "refund_pending"].includes(String(request.status))) return request

    const paymentContext = await resolveRefundPaymentContext({
      container: input.container,
      orderId: input.orderId,
      requestedAmount: input.amount,
      requestedCurrency: null,
      // An order has one authoritative captured payment. Do not constrain this
      // to PayPal: seller review must also be able to refund Stripe payments.
      expectedProviderId: request.payment_provider_id ?? null,
    })
    if (paymentContext.store_id !== input.storeId) throw new Error("Order does not belong to this store")

    const productionContext = await loadProductionContext(input.container, {
      id: paymentContext.order_id,
      metadata: { store_id: paymentContext.store_id },
      payment_collections: [],
    })
    const policy = evaluateRefundPolicy({
      context: productionContext,
      paymentCaptured: true,
      reason: request.reason,
    })
    const sellerApproved = request.decision_type === "seller_approve"
    if (["return", "claim"].includes(policy.decision)) {
      return updateRequest(service, request.id, {
        status: "manual_review",
        decision_type: policy.decision,
        decision_reason: "Return or claim processing is required before a refund.",
        latest_production_status: policy.productionStatus,
      })
    }
    if (!sellerApproved && policy.decision !== "auto_approve") {
      return updateRequest(service, request.id, {
        status: "manual_review",
        decision_type: "manual_review",
        decision_reason: "Production state changed before refund execution.",
        latest_production_status: policy.productionStatus,
      })
    }

    const paymentModule = input.container.resolve(Modules.PAYMENT) as {
      retrievePayment: (id: string, config?: Record<string, unknown>) => Promise<PaymentRecord>
      updatePayment: (input: Record<string, unknown>) => Promise<unknown>
    }
    const paymentBeforeRefund = await paymentModule.retrievePayment(paymentContext.payment_id, {
      relations: ["refunds"],
    })
    const amount = input.amount
    const remaining = paymentContext.remaining_refundable_amount

    request = await updateRequest(service, request.id, {
      status: "refund_processing",
      approved_amount: amount,
      eligible_amount: remaining,
      payment_provider_id: paymentContext.provider_id,
      external_payment_id: paymentContext.paypal_capture_id,
      latest_production_status: policy.productionStatus,
      attempt_count: numberValue(request.attempt_count) + 1,
      last_provider_error_code: null,
    })

    const previousRefundIds = new Set((paymentBeforeRefund.refunds ?? []).map((refund) => String(refund.id ?? "")))
    try {
      if (paymentContext.provider_id === "pp_stripe_stripe") {
        if (!paymentContext.provider_payment_id) throw new Error("Stripe PaymentIntent is missing for refund")
        const stripeRefund = await executeStripeRefund({
          container: input.container,
          paymentIntentId: paymentContext.provider_payment_id,
          amount,
          refundRequestId: request.id,
          orderId: input.orderId,
        })
        return updateRequest(service, request.id, {
          status: amount < remaining ? "partially_refunded" : "refunded",
          provider_status: String(stripeRefund.status ?? "succeeded").toLowerCase(),
          external_refund_id: stripeRefund.id,
          external_transaction_id: stripeRefund.id,
          processed_at: new Date(),
          failed_at: null,
          failure_reason: null,
        })
      }
      await paymentModule.updatePayment({
        id: paymentContext.payment_id,
        data: {
          ...(paymentBeforeRefund.data ?? {}),
          refund_idempotency_key: request.id,
        },
      })
      await refundPaymentWorkflow(input.container).run({
        input: {
          payment_id: paymentContext.payment_id,
          amount,
          created_by: input.createdBy ?? undefined,
          note: [input.note, `refund_request_id=${request.id}`].filter(Boolean).join(" | "),
        },
      })

      const updatedPayment = await paymentModule.retrievePayment(paymentContext.payment_id, {
        relations: ["captures", "refunds"],
      })
      const newRefund = (updatedPayment.refunds ?? []).find((refund) => !previousRefundIds.has(String(refund.id ?? "")))
      if (!newRefund?.id) throw new Error("Medusa did not persist a refund after provider execution")

      const providerState = providerRefundState(updatedPayment, paymentContext.provider_id)
      const providerRefundId = typeof updatedPayment.data?.paypal_refund_id === "string"
        ? updatedPayment.data.paypal_refund_id
        : String(newRefund.id)
      if (providerState === "pending") {
        return updateRequest(service, request.id, {
          status: "refund_pending",
          provider_status: "pending",
          external_refund_id: providerRefundId,
          external_transaction_id: String(newRefund.id),
          failed_at: null,
          failure_reason: null,
        })
      }
      if (providerState === "failed") {
        return updateRequest(service, request.id, {
          status: "refund_failed",
          provider_status: "failed",
          external_refund_id: providerRefundId,
          external_transaction_id: String(newRefund.id),
          failed_at: new Date(),
          failure_reason: "Refund provider reported a failed status.",
        })
      }
      return updateRequest(service, request.id, {
        status: amount < remaining ? "partially_refunded" : "refunded",
        provider_status: "completed",
        external_refund_id: providerRefundId,
        external_transaction_id: String(newRefund.id),
        processed_at: new Date(),
        failed_at: null,
        failure_reason: null,
      })
    } catch (error) {
      const indeterminate = isIndeterminateProviderError(error)
      return updateRequest(service, request.id, {
        status: indeterminate ? "refund_pending" : "refund_failed",
        provider_status: indeterminate ? "pending" : "failed",
        failure_reason: indeterminate ? "Provider status is being reconciled." : "Refund provider rejected the request.",
        last_provider_error_code: error instanceof Error ? error.name : "REFUND_PROVIDER_ERROR",
        failed_at: indeterminate ? null : new Date(),
      })
    }
  }, { timeout: 30 })
}
