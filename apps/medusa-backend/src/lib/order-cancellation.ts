import type { MedusaRequest } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { readOrderStoreId } from "./order-store-context"
import {
  ORDER_META_PAYMENT_STATUS,
  readOrderFulfillmentStatusMeta,
} from "./order-custom-metadata"
import { FULFILLMENT_ORDERS_MODULE } from "../modules/fulfillment-orders"
import type FulfillmentOrdersModuleService from "../modules/fulfillment-orders/service"

export type CancellationEligibility =
  | { allowed: true; code: null; message: null }
  | { allowed: false; code: string; message: string }

type PaymentCapture = {
  amount?: unknown
  raw_amount?: unknown
  captured_at?: unknown
}

type PaymentRefund = {
  amount?: unknown
  raw_amount?: unknown
}

type PaymentRecord = {
  id?: string
  status?: unknown
  amount?: unknown
  raw_amount?: unknown
  captured_at?: unknown
  captures?: PaymentCapture[] | null
  refunds?: PaymentRefund[] | null
}

type PaymentCollectionRecord = {
  id?: string
  status?: unknown
  completed_at?: unknown
  authorized_amount?: unknown
  raw_authorized_amount?: unknown
  captured_amount?: unknown
  raw_captured_amount?: unknown
  refunded_amount?: unknown
  raw_refunded_amount?: unknown
  payments?: PaymentRecord[] | null
  payment_sessions?: Array<{ status?: unknown }> | null
}

type FulfillmentRecord = {
  id?: string
  status?: unknown
  canceled_at?: unknown
  shipped_at?: unknown
  delivered_at?: unknown
}

export type CancellationOrder = {
  id?: string
  display_id?: string | number | null
  customer_id?: string | null
  status?: string | null
  payment_status?: string | null
  fulfillment_status?: string | null
  canceled_at?: string | Date | null
  cancelled_at?: string | Date | null
  metadata?: Record<string, unknown> | null
  payment_collections?: PaymentCollectionRecord[] | null
  fulfillments?: FulfillmentRecord[] | null
}

export type CancellationContext = {
  order: CancellationOrder
  paymentStateResolved: boolean
  fulfillmentStateResolved: boolean
  customFulfillmentOrders: Array<{
    id?: string
    status?: string | null
    supplier_order_id?: string | null
    pushed_at?: string | Date | null
  }>
}

const allowedPaymentStatuses = new Set(["", "pending", "not_paid", "awaiting", "authorized"])
const rejectedPaymentStatuses = new Set([
  "paid",
  "captured",
  "partially_paid",
  "partially_captured",
  "refunded",
  "partially_refunded",
  "requires_refund",
  "completed",
])

const allowedFulfillmentStatuses = new Set(["", "none", "not_fulfilled", "unfulfilled"])
const rejectedFulfillmentStatuses = new Set([
  "waiting",
  "pushed",
  "fulfilled",
  "partially_fulfilled",
  "shipped",
  "partially_shipped",
  "delivered",
  "partially_delivered",
  "returned",
  "partially_returned",
  "requires_action",
])

const terminalOrderStatuses = new Set(["completed", "complete", "archived"])

const normalizeStatus = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : ""

const readNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  if (value && typeof value === "object") {
    const candidate = (value as { value?: unknown; numeric?: unknown }).value ?? (value as { numeric?: unknown }).numeric
    return readNumber(candidate)
  }
  return 0
}

const hasPositiveAmount = (value: unknown) => readNumber(value) > 0

const denial = (code: string, message: string): CancellationEligibility => ({
  allowed: false,
  code,
  message,
})

const ok: CancellationEligibility = { allowed: true, code: null, message: null }

export const validateCancelReason = (reason: unknown): string | undefined => {
  if (reason == null) return undefined
  if (typeof reason !== "string") {
    throw Object.assign(new Error("Cancel reason must be a string"), {
      code: "ORDER_CANCEL_REASON_INVALID",
      status: 400,
    })
  }
  const trimmed = reason.trim()
  if (!trimmed) return undefined
  if (trimmed.length > 500) {
    throw Object.assign(new Error("Cancel reason must be 500 characters or fewer"), {
      code: "ORDER_CANCEL_REASON_TOO_LONG",
      status: 400,
    })
  }
  if (/[<>]/.test(trimmed)) {
    throw Object.assign(new Error("Cancel reason cannot contain HTML"), {
      code: "ORDER_CANCEL_REASON_INVALID",
      status: 400,
    })
  }
  return trimmed
}

const readPaymentStatus = (order: CancellationOrder) =>
  normalizeStatus(
    order.payment_status ??
      order.metadata?.[ORDER_META_PAYMENT_STATUS]
  )

const readFulfillmentStatus = (order: CancellationOrder) =>
  normalizeStatus(
    order.fulfillment_status ??
      readOrderFulfillmentStatusMeta(order.metadata ?? null)
  )

const orderIsCancelled = (order: CancellationOrder) =>
  Boolean(order.canceled_at ?? order.cancelled_at) ||
  ["canceled", "cancelled"].includes(normalizeStatus(order.status))

const hasCapturedPayment = (order: CancellationOrder) => {
  for (const collection of order.payment_collections ?? []) {
    if (
      collection.completed_at ||
      hasPositiveAmount(collection.captured_amount) ||
      hasPositiveAmount(collection.raw_captured_amount)
    ) {
      return true
    }

    for (const payment of collection.payments ?? []) {
      if (
        payment.captured_at ||
        hasPositiveAmount(payment.captures?.length ?? 0)
      ) {
        return true
      }
      for (const capture of payment.captures ?? []) {
        if (
          capture.captured_at ||
          hasPositiveAmount(capture.amount) ||
          hasPositiveAmount(capture.raw_amount)
        ) {
          return true
        }
      }
    }
  }
  return false
}

const hasSuccessfulPayment = (order: CancellationOrder) => {
  for (const collection of order.payment_collections ?? []) {
    const collectionStatus = normalizeStatus(collection.status)
    if (["completed", "captured", "paid", "partially_captured"].includes(collectionStatus)) {
      return true
    }
    for (const payment of collection.payments ?? []) {
      const status = normalizeStatus(payment.status)
      if (rejectedPaymentStatuses.has(status)) return true
    }
    for (const session of collection.payment_sessions ?? []) {
      const status = normalizeStatus(session.status)
      if (["captured", "paid", "partially_captured", "completed"].includes(status)) {
        return true
      }
    }
  }
  return false
}

export const hasActivePaymentAuthorization = (order: CancellationOrder) => {
  for (const collection of order.payment_collections ?? []) {
    const collectionStatus = normalizeStatus(collection.status)
    if (["canceled", "cancelled"].includes(collectionStatus)) {
      continue
    }
    if (collectionStatus === "authorized") return true
    if (
      hasPositiveAmount(collection.authorized_amount) ||
      hasPositiveAmount(collection.raw_authorized_amount)
    ) {
      return true
    }
    for (const payment of collection.payments ?? []) {
      const paymentStatus = normalizeStatus(payment.status)
      if (paymentStatus === "authorized" && !payment.captured_at) return true
    }
    for (const session of collection.payment_sessions ?? []) {
      if (normalizeStatus(session.status) === "authorized") return true
    }
  }
  return false
}

const hasNativeFulfillment = (order: CancellationOrder) => {
  return (order.fulfillments ?? []).some((fulfillment) => {
    if (!fulfillment?.id) return false
    return true
  })
}

const hasCustomFulfillment = (context: CancellationContext) =>
  context.customFulfillmentOrders.length > 0

export function evaluateCancellationEligibility(
  context: CancellationContext,
  input: {
    authCustomerId?: string | null
    requestedStoreId: string
  }
): CancellationEligibility {
  const { order } = context
  const orderId = order.id
  if (!orderId) {
    return denial("ORDER_NOT_FOUND", "Order was not found.")
  }

  if (!input.authCustomerId) {
    return denial("ORDER_ACCESS_DENIED", "Sign in before cancelling this order.")
  }

  if (!order.customer_id || order.customer_id !== input.authCustomerId) {
    return denial("ORDER_ACCESS_DENIED", "This order does not belong to the current customer.")
  }

  if (readOrderStoreId(order) !== input.requestedStoreId) {
    return denial("ORDER_WRONG_STORE", "This order does not belong to the current store.")
  }

  if (orderIsCancelled(order)) {
    return denial("ORDER_ALREADY_CANCELLED", "This order has already been cancelled.")
  }

  const orderStatus = normalizeStatus(order.status)
  if (terminalOrderStatuses.has(orderStatus)) {
    return denial("ORDER_NOT_CANCELLABLE", "Completed orders cannot be cancelled from the buyer portal.")
  }

  if (!context.paymentStateResolved) {
    return denial("ORDER_NOT_CANCELLABLE", "Unable to confirm the order is unpaid.")
  }

  const paymentStatus = readPaymentStatus(order)
  if (rejectedPaymentStatuses.has(paymentStatus)) {
    return denial("ORDER_ALREADY_PAID", "Paid orders require a refund request instead of cancellation.")
  }
  if (paymentStatus && !allowedPaymentStatuses.has(paymentStatus)) {
    return denial("ORDER_NOT_CANCELLABLE", "Unable to confirm the order is unpaid.")
  }

  if (hasCapturedPayment(order)) {
    return denial("ORDER_PAYMENT_CAPTURED", "Captured payments cannot be cancelled from the buyer portal.")
  }

  if (hasSuccessfulPayment(order)) {
    return denial("ORDER_ALREADY_PAID", "Orders with successful payment records cannot be cancelled from the buyer portal.")
  }

  if (!context.fulfillmentStateResolved) {
    return denial("ORDER_HAS_FULFILLMENT", "Unable to confirm the order is unfulfilled.")
  }

  const fulfillmentStatus = readFulfillmentStatus(order)
  if (rejectedFulfillmentStatuses.has(fulfillmentStatus)) {
    return denial("ORDER_ALREADY_FULFILLED", "Fulfilled orders cannot be cancelled from the buyer portal.")
  }
  if (fulfillmentStatus && !allowedFulfillmentStatuses.has(fulfillmentStatus)) {
    return denial("ORDER_HAS_FULFILLMENT", "Unable to confirm the order is unfulfilled.")
  }

  if (hasNativeFulfillment(order) || hasCustomFulfillment(context)) {
    return denial("ORDER_HAS_FULFILLMENT", "Orders with fulfillment records cannot be cancelled from the buyer portal.")
  }

  return ok
}

export const summarizeCancellationContext = (
  context: CancellationContext,
  input: { authCustomerId?: string | null; requestedStoreId: string }
) => ({
  order_id: context.order.id ?? null,
  display_id: context.order.display_id ?? null,
  auth_customer_id: input.authCustomerId ?? null,
  order_customer_id: context.order.customer_id ?? null,
  requested_store_id: input.requestedStoreId,
  order_store_id: readOrderStoreId(context.order),
  order_status: context.order.status ?? null,
  payment_status: readPaymentStatus(context.order) || null,
  payment_collection_status: (context.order.payment_collections ?? []).map((pc) => pc.status ?? null),
  authorized_amount: (context.order.payment_collections ?? []).reduce(
    (sum, pc) => sum + readNumber(pc.authorized_amount) + readNumber(pc.raw_authorized_amount),
    0
  ),
  captured_amount: (context.order.payment_collections ?? []).reduce(
    (sum, pc) => sum + readNumber(pc.captured_amount) + readNumber(pc.raw_captured_amount),
    0
  ),
  active_authorization: hasActivePaymentAuthorization(context.order),
  fulfillment_status: readFulfillmentStatus(context.order) || null,
  fulfillment_count: (context.order.fulfillments ?? []).length + context.customFulfillmentOrders.length,
  payment_state_resolved: context.paymentStateResolved,
  fulfillment_state_resolved: context.fulfillmentStateResolved,
})

const loadOrderFromGraph = async (
  req: MedusaRequest,
  orderId: string
): Promise<CancellationOrder | null> => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = (await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "customer_id",
      "status",
      "payment_status",
      "fulfillment_status",
      "canceled_at",
      "metadata",
      "payment_collections.id",
      "payment_collections.status",
      "payment_collections.completed_at",
      "payment_collections.authorized_amount",
      "payment_collections.raw_authorized_amount",
      "payment_collections.captured_amount",
      "payment_collections.raw_captured_amount",
      "payment_collections.payments.id",
      "payment_collections.payments.status",
      "payment_collections.payments.captured_at",
      "payment_collections.payments.captures.id",
      "payment_collections.payments.captures.amount",
      "payment_collections.payments.captures.raw_amount",
      "payment_collections.payment_sessions.status",
      "fulfillments.id",
      "fulfillments.status",
      "fulfillments.canceled_at",
      "fulfillments.shipped_at",
      "fulfillments.delivered_at",
    ],
    filters: { id: orderId },
    options: { throwIfKeyNotFound: false },
  } as never)) as { data?: CancellationOrder[] }
  return data?.[0] ?? null
}

export async function loadCancellationContext(
  req: MedusaRequest,
  orderId: string,
  fallbackOrder?: CancellationOrder
): Promise<CancellationContext> {
  let order: CancellationOrder | null = null
  try {
    order = await loadOrderFromGraph(req, orderId)
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[order-cancel] query graph cancellation context failed", {
        order_id: orderId,
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  if (!order) {
    const orderModule = req.scope.resolve(Modules.ORDER)
    order = (await orderModule.retrieveOrder(orderId, {
      relations: ["payment_collections", "fulfillments"],
    } as never)) as CancellationOrder
  }

  order = { ...order, ...(fallbackOrder ?? {}) }
  const paymentStateResolved = Object.prototype.hasOwnProperty.call(order, "payment_collections")
  const fulfillmentStateResolved = Object.prototype.hasOwnProperty.call(order, "fulfillments")

  const foService = req.scope.resolve(FULFILLMENT_ORDERS_MODULE) as FulfillmentOrdersModuleService
  const customFulfillmentOrders = await foService.listFulfillmentOrders({ order_id: [orderId] })

  return {
    order,
    paymentStateResolved,
    fulfillmentStateResolved,
    customFulfillmentOrders,
  }
}

export const cancellationResponse = (eligibility: CancellationEligibility) => ({
  allowed: eligibility.allowed,
  code: eligibility.allowed ? null : eligibility.code,
  message: eligibility.allowed ? null : eligibility.message,
})
