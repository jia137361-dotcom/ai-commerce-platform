import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { randomUUID } from "node:crypto"
import { assertBuyerEmailVerified } from "../../../../../../../lib/buyer-auth-access"
import { resolveAuthenticatedBuyerOrder } from "../../../../../../../lib/buyer-order-access"
import { loadCancellationContext } from "../../../../../../../lib/order-cancellation"
import {
  evaluateRefundRequestEligibility,
  serializeBuyerRefundRequest,
  validateRefundRequestText,
  type BuyerRefundRequestRecord,
} from "../../../../../../../lib/order-refund-request"
import { OrderStoreAccessError } from "../../../../../../../lib/order-store-error"
import { resolveCurrentStore } from "../../../../../../../lib/store-context"
import { evaluateRefundPolicy } from "../../../../../../../lib/refund-policy"
import { executeApprovedRefund } from "../../../../../../../lib/refund-execution"
import {
  BUYER_REFUND_REQUESTS_MODULE,
} from "../../../../../../../modules/buyer-refund-requests"
import type BuyerRefundRequestsModuleService from "../../../../../../../modules/buyer-refund-requests/service"

type AuthenticatedRequest = MedusaRequest & {
  auth_context?: { actor_id?: string }
}

type RefundRequestService = BuyerRefundRequestsModuleService & {
  listBuyerRefundRequests: (
    filters: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<BuyerRefundRequestRecord[]>
  createBuyerRefundRequests: (
    input: Record<string, unknown>
  ) => Promise<BuyerRefundRequestRecord>
  updateBuyerRefundRequests: (
    input: Record<string, unknown>
  ) => Promise<BuyerRefundRequestRecord[] | BuyerRefundRequestRecord>
}

const refundDiagnosticsEnabled = () =>
  process.env.NODE_ENV === "development" && process.env.PAY_REFUND_ROUTE_DIAGNOSTICS === "true"

const logRefundDiagnostic = (stage: string, input: Record<string, unknown>) => {
  if (!refundDiagnosticsEnabled()) return
  console.info("[buyer-refund-diagnostic]", JSON.stringify({ stage, ...input }))
}

const readHeader = (req: MedusaRequest, name: string) => {
  const value = req.headers[name.toLowerCase()]
  return Array.isArray(value) ? value[0] : value
}

const validateAccessHeaders = (req: MedusaRequest) => {
  if (!readHeader(req, "x-publishable-api-key")) {
    return "x-publishable-api-key is required"
  }
  if (!readHeader(req, "x-store-id")) return "X-Store-Id is required"
  return null
}

const readAuthCustomerId = (req: MedusaRequest) =>
  (req as AuthenticatedRequest).auth_context?.actor_id

const readIdempotencyKey = (req: MedusaRequest, body: Record<string, unknown>) => {
  const header = readHeader(req, "idempotency-key")
  const bodyKey = typeof body.idempotency_key === "string" ? body.idempotency_key : ""
  const value = String(header ?? bodyKey).trim()
  return value ? value.slice(0, 180) : `refund:${req.params.id}:${readAuthCustomerId(req) ?? "guest"}`
}

const loadOwnedOrder = async (req: MedusaRequest, diagnosticId?: string) => {
  const authCustomerId = readAuthCustomerId(req)
  const orderId = req.params.id as string
  logRefundDiagnostic("auth_context_extraction", {
    correlation_id: diagnosticId ?? null,
    request_order_id: orderId,
    authenticated_actor_id: authCustomerId ?? null,
  })
  if (!authCustomerId) {
    throw Object.assign(new Error("Customer session is required."), {
      code: "ORDER_ACCESS_DENIED",
      status: 401,
    })
  }

  logRefundDiagnostic("path_order_id_extraction", {
    correlation_id: diagnosticId ?? null,
    request_order_id: orderId,
    authenticated_actor_id: authCustomerId,
    received_store_id: readHeader(req, "x-store-id") ?? null,
  })
  const order = await resolveAuthenticatedBuyerOrder(req, {
    orderId,
    customerId: authCustomerId,
    diagnosticId,
  })
  return { orderId, order, authCustomerId }
}

const numericValue = (value: unknown): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  if (value && typeof value === "object") {
    const candidate = value as { value?: unknown; numeric?: unknown }
    return numericValue(candidate.value ?? candidate.numeric)
  }
  return 0
}

const normalizeRequestedItems = (
  order: Record<string, unknown>,
  value: unknown,
  existingRequests: BuyerRefundRequestRecord[]
) => {
  if (value == null) return null
  if (!Array.isArray(value) || !value.length) {
    throw Object.assign(new Error("Select at least one order item."), {
      code: "REFUND_ITEMS_INVALID",
      status: 400,
    })
  }
  const orderItems = Array.isArray(order.items) ? order.items as Array<Record<string, unknown>> : []
  const previouslyRefunded = new Map<string, number>()
  for (const request of existingRequests) {
    if (!["approved", "processing", "refund_processing", "refund_pending", "partially_refunded", "refunded", "processed"].includes(String(request.status))) continue
    if (!Array.isArray(request.requested_items)) continue
    for (const entry of request.requested_items as Array<Record<string, unknown>>) {
      const itemId = String(entry.item_id ?? entry.id ?? "")
      previouslyRefunded.set(itemId, (previouslyRefunded.get(itemId) ?? 0) + numericValue(entry.quantity))
    }
  }

  let requestedAmount = 0
  const items = value.map((entry) => {
    if (!entry || typeof entry !== "object") {
      throw Object.assign(new Error("Refund item is invalid."), { code: "REFUND_ITEMS_INVALID", status: 400 })
    }
    const input = entry as Record<string, unknown>
    const itemId = String(input.item_id ?? input.id ?? "").trim()
    const quantity = numericValue(input.quantity)
    const item = orderItems.find((candidate) => candidate.id === itemId)
    const orderedQuantity = numericValue(item?.quantity)
    const remainingQuantity = orderedQuantity - (previouslyRefunded.get(itemId) ?? 0)
    if (!item || !Number.isInteger(quantity) || quantity <= 0 || quantity > remainingQuantity) {
      throw Object.assign(new Error("Refund quantity exceeds the remaining order item quantity."), {
        code: "REFUND_QUANTITY_INVALID",
        status: 400,
      })
    }
    const subtotal = numericValue(item.subtotal)
    const discount = numericValue(item.discount_total)
    const tax = numericValue(item.tax_total)
    const lineTotal = numericValue(item.total) || Math.max(0, subtotal - discount + tax)
    if (!(lineTotal > 0) || !(orderedQuantity > 0)) {
      throw Object.assign(new Error("Unable to calculate the selected item's refundable amount."), {
        code: "REFUND_ITEM_AMOUNT_UNAVAILABLE",
        status: 409,
      })
    }
    requestedAmount += lineTotal * (quantity / orderedQuantity)
    return { item_id: itemId, quantity }
  })
  return { items, requestedAmount }
}

const listOrderRequests = async (
  service: RefundRequestService,
  input: { orderId: string; customerId: string; storeId: string }
) =>
  service.listBuyerRefundRequests(
    {
      order_id: input.orderId,
      customer_id: input.customerId,
      store_id: input.storeId,
    },
    { order: { created_at: "DESC" } }
  )

const errorResponse = (res: MedusaResponse, error: unknown, diagnosticId?: string) => {
  logRefundDiagnostic("post_error", {
    correlation_id: diagnosticId ?? null,
    original_exception_name: error instanceof Error ? error.name : typeof error,
    original_exception_message: error instanceof Error ? error.message : String(error),
  })
  if (error instanceof OrderStoreAccessError) {
    return res.status(403).json({ error: { code: error.code, message: error.message } })
  }
  const status = (error as { status?: unknown }).status
  const code = (error as { code?: unknown }).code
  if (typeof status === "number" && status >= 400 && status < 500) {
    return res.status(status).json({
      error: {
        code: typeof code === "string" ? code : "REFUND_REQUEST_INVALID",
        message: error instanceof Error ? error.message : "Invalid refund request.",
      },
    })
  }
  console.error("[buyer-refund-request] failed", {
    exception_name: error instanceof Error ? error.name : typeof error,
    exception_message: error instanceof Error ? error.message : String(error),
  })
  return res.status(500).json({
    error: {
      code: "ORDER_REFUND_REQUEST_ERROR",
      message: "Failed to process refund request.",
    },
  })
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const headerError = validateAccessHeaders(req)
    if (headerError) {
      return res.status(401).json({
        error: { code: "REFUND_REQUEST_HEADER_REQUIRED", message: headerError },
      })
    }
    const { orderId, authCustomerId } = await loadOwnedOrder(req)
    const storeId = resolveCurrentStore(req).store_id
    const service = req.scope.resolve(BUYER_REFUND_REQUESTS_MODULE) as RefundRequestService
    const requests = await listOrderRequests(service, {
      orderId,
      customerId: authCustomerId,
      storeId,
    })
    return res.status(200).json({
      refund_requests: requests.map(serializeBuyerRefundRequest),
    })
  } catch (error) {
    return errorResponse(res, error)
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  let diagnosticId: string | undefined
  let refundRequestInserted = false
  try {
    diagnosticId = readHeader(req, "x-request-id")?.trim() || randomUUID()
    logRefundDiagnostic("route_entry", {
      correlation_id: diagnosticId,
      request_order_id: req.params.id ?? null,
      received_store_id: readHeader(req, "x-store-id") ?? null,
    })
    const headerError = validateAccessHeaders(req)
    if (headerError) {
      return res.status(401).json({
        error: { code: "REFUND_REQUEST_HEADER_REQUIRED", message: headerError },
      })
    }
    const body = (req.body ?? {}) as Record<string, unknown>
    const text = validateRefundRequestText(body)
    const { orderId, order, authCustomerId } = await loadOwnedOrder(req, diagnosticId)
    if (!(await assertBuyerEmailVerified(req, res, authCustomerId))) return
    const storeId = resolveCurrentStore(req).store_id
    const service = req.scope.resolve(BUYER_REFUND_REQUESTS_MODULE) as RefundRequestService
    logRefundDiagnostic("payment_refund_eligibility_lookup", {
      correlation_id: diagnosticId,
      request_order_id: orderId,
      authenticated_actor_id: authCustomerId,
      received_store_id: storeId,
      resolved_order_id: order.id ?? null,
      resolved_order_customer_id: order.customer_id ?? null,
      resolved_order_store_id: order.metadata?.store_id ?? null,
    })
    const existingRequests = await listOrderRequests(service, {
      orderId,
      customerId: authCustomerId,
      storeId,
    })
    const idempotencyKey = readIdempotencyKey(req, body)
    logRefundDiagnostic("idempotency_refund_request_lookup", {
      correlation_id: diagnosticId,
      request_order_id: orderId,
      authenticated_actor_id: authCustomerId,
      existing_refund_request_count: existingRequests.length,
      idempotency_key_present: Boolean(idempotencyKey),
    })
    const idempotent = existingRequests.find((entry) => entry.idempotency_key === idempotencyKey)
    if (idempotent) return res.status(200).json({ refund_request: serializeBuyerRefundRequest(idempotent) })
    const context = await loadCancellationContext(req, orderId, order)
    const eligibility = evaluateRefundRequestEligibility(context, {
      authCustomerId,
      requestedStoreId: storeId,
      existingRequests,
    })
    logRefundDiagnostic("payment_refund_eligibility_result", {
      correlation_id: diagnosticId,
      request_order_id: orderId,
      authenticated_actor_id: authCustomerId,
      eligibility_allowed: eligibility.allowed,
      eligibility_code: eligibility.code,
      requested_amount: eligibility.requestedAmount,
      currency_code: eligibility.currencyCode,
    })
    if (!eligibility.allowed) {
      return res.status(409).json({
        error: { code: eligibility.code, message: eligibility.message },
        refund_request: {
          allowed: false,
          code: eligibility.code,
          message: eligibility.message,
          open_request: existingRequests.find((row) =>
            ["pending", "requested", "auto_review", "manual_review", "awaiting_information", "approved", "processing", "refund_processing", "refund_pending"].includes(row.status ?? "")
          ) ? serializeBuyerRefundRequest(existingRequests.find((row) =>
            ["pending", "requested", "auto_review", "manual_review", "awaiting_information", "approved", "processing", "refund_processing", "refund_pending"].includes(row.status ?? "")
          )!) : null,
        },
      })
    }

    const selectedItems = normalizeRequestedItems(order as unknown as Record<string, unknown>, body.items, existingRequests)
    const requestedAmountInput = selectedItems
      ? selectedItems.requestedAmount
      : eligibility.requestedAmount
    if (!Number.isFinite(requestedAmountInput) || requestedAmountInput <= 0 || requestedAmountInput > eligibility.requestedAmount) {
      return res.status(400).json({ error: { code: "REFUND_AMOUNT_INVALID", message: "Requested refund amount is outside the refundable balance." } })
    }
    const policy = evaluateRefundPolicy({ context, paymentCaptured: true, reason: text.reason })
    const initialStatus = policy.decision === "auto_approve" ? "auto_review" : policy.decision === "manual_review" ? "manual_review" : "manual_review"
    const sourcePayment = context.order.payment_collections
      ?.flatMap((collection) => collection.payments ?? [])
      .find((payment) => payment.captured_at || (payment.captures?.length ?? 0) > 0)
    const sourcePaymentData = sourcePayment?.data ?? null

    const displayId = Number(order.display_id)
    logRefundDiagnostic("refund_request_insert_preparation", {
      correlation_id: diagnosticId,
      request_order_id: orderId,
      authenticated_actor_id: authCustomerId,
      requested_amount: requestedAmountInput,
      policy_decision: policy.decision,
      transaction_started: false,
      transaction_rolled_back: false,
      refund_request_inserted: false,
    })
    const created = await service.createBuyerRefundRequests({
      order_id: orderId,
      display_id: Number.isFinite(displayId) ? displayId : null,
      customer_id: authCustomerId,
      store_id: storeId,
      currency_code: eligibility.currencyCode,
      requested_amount: requestedAmountInput,
      eligible_amount: eligibility.requestedAmount,
      approved_amount: null,
      requested_items: selectedItems?.items ?? null,
      reason: text.reason,
      note: text.note,
      status: initialStatus,
      payment_provider_id: sourcePayment?.provider_id ?? null,
      external_payment_id:
        typeof sourcePaymentData?.paypal_capture_id === "string"
          ? sourcePaymentData.paypal_capture_id
          : typeof sourcePaymentData?.id === "string"
            ? sourcePaymentData.id
            : sourcePayment?.id ?? null,
      external_refund_id: null,
      external_transaction_id: null,
      provider_status: "not_connected",
      provider_payload: null,
      idempotency_key: idempotencyKey,
      attempt_count: 0,
      policy_result: policy.policyResult,
      decision_type: policy.decision,
      decision_reason: policy.decision === "auto_approve" ? "Production has not started." : "Seller review is required.",
      production_status_snapshot: policy.productionStatus,
      latest_production_status: policy.productionStatus,
      metadata: { scope: selectedItems ? "item_selection" : "full_order" },
    })
    refundRequestInserted = true
    logRefundDiagnostic("refund_request_insertion", {
      correlation_id: diagnosticId,
      request_order_id: orderId,
      refund_request_id: created.id ?? null,
      transaction_started: false,
      transaction_rolled_back: false,
      refund_request_inserted: true,
    })

    const finalRequest = policy.decision === "auto_approve"
      ? await executeApprovedRefund({
          container: req.scope,
          refundRequestId: created.id!,
          orderId,
          storeId,
          amount: requestedAmountInput,
          createdBy: authCustomerId,
          note: text.note,
        })
      : created

    if (process.env.NODE_ENV !== "production") {
      console.info("[buyer-refund-request] created", {
        refund_request_id: created.id,
        order_id: orderId,
        customer_id: authCustomerId,
        store_id: storeId,
        requested_amount: eligibility.requestedAmount,
        currency_code: eligibility.currencyCode,
        status: finalRequest.status,
      })
    }

    return res.status(201).json({
      refund_request: serializeBuyerRefundRequest(finalRequest),
    })
  } catch (error) {
    logRefundDiagnostic("refund_request_insertion_failure", {
      correlation_id: diagnosticId ?? null,
      transaction_started: false,
      transaction_rolled_back: false,
      refund_request_inserted: refundRequestInserted,
    })
    return errorResponse(res, error, diagnosticId)
  }
}
