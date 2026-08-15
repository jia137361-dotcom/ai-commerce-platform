import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { resolveAdminUserId } from "../../../../../lib/platform-admin/require-platform-operator"
import { resolveSellerSession } from "../../../../../lib/seller-register"
import { loadCancellationContext } from "../../../../../lib/order-cancellation"
import { evaluateRefundPolicy } from "../../../../../lib/refund-policy"
import { executeApprovedRefund } from "../../../../../lib/refund-execution"
import { BUYER_REFUND_REQUESTS_MODULE } from "../../../../../modules/buyer-refund-requests"
import { serializeBuyerRefundRequest, type BuyerRefundRequestRecord } from "../../../../../lib/order-refund-request"
import { RefundPaymentContextError } from "../../../../../lib/refund-payment-context"
import { sendError } from "../../../../_helpers/store-core"

const numeric = (value: unknown) => {
  const result = Number(value)
  return Number.isFinite(result) ? result : 0
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
  const userId = resolveAdminUserId(req)
  if (!userId) return sendError(res, 401, "UNAUTHORIZED", "Seller authentication required")
  const session = await resolveSellerSession(req.scope, userId)
  if (!session.store_id) return sendError(res, 404, "STORE_NOT_FOUND", "No seller store is linked to this account")
  const service = req.scope.resolve(BUYER_REFUND_REQUESTS_MODULE) as {
    listBuyerRefundRequests: (filters: Record<string, unknown>, config?: Record<string, unknown>) => Promise<BuyerRefundRequestRecord[]>
    updateBuyerRefundRequests: (input: Record<string, unknown>) => Promise<BuyerRefundRequestRecord[] | BuyerRefundRequestRecord>
  }
  const request = (await service.listBuyerRefundRequests({ id: [req.params.id], store_id: [session.store_id] }, { take: 1 }))[0]
  if (!request?.id || !request.order_id) return sendError(res, 404, "NOT_FOUND", "Refund request was not found")
  if (["refunded", "processed", "partially_refunded", "refund_processing", "processing", "refund_pending"].includes(String(request.status))) {
    return res.status(200).json({ refund_request: serializeBuyerRefundRequest(request) })
  }
  const body = (req.body ?? {}) as Record<string, unknown>
  const action = typeof body.action === "string" ? body.action : ""
  if (!["manual_review", "pending", "requested", "awaiting_information", "approved", "refund_failed"].includes(String(request.status))) {
    return sendError(res, 409, "VALIDATION_ERROR", "This refund request can no longer be changed.")
  }
  const orderModule = req.scope.resolve(Modules.ORDER)
  const order = await orderModule.retrieveOrder(request.order_id, { relations: ["payment_collections", "fulfillments"] } as never)
  const context = await loadCancellationContext(req, request.order_id, order)
  const policy = evaluateRefundPolicy({ context, paymentCaptured: true, reason: request.reason })
  const eligible = numeric(request.eligible_amount ?? request.requested_amount)

  if (action === "reject") {
    const updated = await service.updateBuyerRefundRequests({
      id: request.id,
      status: "rejected",
      reviewed_by: userId,
      reviewed_at: new Date(),
      decision_type: "manual_reject",
      decision_reason: typeof body.reason === "string" ? body.reason.slice(0, 500) : "Seller rejected the request.",
      latest_production_status: policy.productionStatus,
    })
    return res.status(200).json({ refund_request: serializeBuyerRefundRequest((Array.isArray(updated) ? updated[0] : updated) as BuyerRefundRequestRecord) })
  }
  if (action === "request_information") {
    const updated = await service.updateBuyerRefundRequests({
      id: request.id,
      status: "awaiting_information",
      reviewed_by: userId,
      reviewed_at: new Date(),
      decision_type: "manual_information",
      decision_reason: typeof body.reason === "string" ? body.reason.slice(0, 500) : "Additional information is required.",
      latest_production_status: policy.productionStatus,
    })
    return res.status(200).json({ refund_request: serializeBuyerRefundRequest((Array.isArray(updated) ? updated[0] : updated) as BuyerRefundRequestRecord) })
  }
  if (action !== "approve") return sendError(res, 400, "VALIDATION_ERROR", "Use approve, reject, or request_information")
  if (["return", "claim"].includes(policy.decision)) {
    return sendError(res, 409, "VALIDATION_ERROR", "Shipped or delivered orders must use the return or claim flow.")
  }
  const approvedAmount = body.amount == null ? eligible : numeric(body.amount)
  if (!(approvedAmount > 0) || approvedAmount > eligible) return sendError(res, 400, "VALIDATION_ERROR", "Approved amount exceeds the eligible amount")
  await service.updateBuyerRefundRequests({
    id: request.id,
    status: "approved",
    approved_amount: approvedAmount,
    reviewed_by: userId,
    reviewed_at: new Date(),
    decision_type: "seller_approve",
    decision_reason: typeof body.reason === "string" ? body.reason.slice(0, 500) : "Seller approved refund.",
    latest_production_status: policy.productionStatus,
  })
  const executed = await executeApprovedRefund({
    container: req.scope,
    refundRequestId: request.id,
    orderId: request.order_id,
    storeId: session.store_id,
    amount: approvedAmount,
    createdBy: userId,
    note: request.note,
  })
  return res.status(200).json({ refund_request: serializeBuyerRefundRequest(executed) })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process the refund request"
    const code = error instanceof RefundPaymentContextError ? error.code : "REFUND_DECISION_FAILED"
    console.error("[seller-refund-decision] failed", {
      refund_request_id: req.params.id,
      code,
      message,
    })
    return res.status(error instanceof RefundPaymentContextError ? 409 : 500).json({
      error: { code, message },
    })
  }
}
