import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { assertOrderBelongsToCurrentStore } from "../../../../../../../../lib/order-store-context"
import { OrderStoreAccessError } from "../../../../../../../../lib/order-store-error"
import { BUYER_REFUND_REQUESTS_MODULE } from "../../../../../../../../modules/buyer-refund-requests"
import { serializeBuyerRefundRequest, type BuyerRefundRequestRecord } from "../../../../../../../../lib/order-refund-request"

type AuthenticatedRequest = MedusaRequest & { auth_context?: { actor_id?: string } }

const readHeader = (req: MedusaRequest, name: string) => {
  const value = req.headers[name.toLowerCase()]
  return Array.isArray(value) ? value[0] : value
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    if (!readHeader(req, "x-publishable-api-key") || !readHeader(req, "x-store-id")) {
      return res.status(401).json({ error: { code: "REFUND_REQUEST_HEADER_REQUIRED", message: "Store access headers are required." } })
    }
    const customerId = (req as AuthenticatedRequest).auth_context?.actor_id
    if (!customerId) return res.status(401).json({ error: { code: "ORDER_ACCESS_DENIED", message: "Customer session is required." } })
    const orderId = req.params.id as string
    const orderModule = req.scope.resolve(Modules.ORDER)
    const order = await orderModule.retrieveOrder(orderId)
    assertOrderBelongsToCurrentStore(req, order)
    if (order.customer_id !== customerId) {
      return res.status(403).json({ error: { code: "ORDER_ACCESS_DENIED", message: "This order does not belong to the current customer." } })
    }
    const service = req.scope.resolve(BUYER_REFUND_REQUESTS_MODULE) as {
      listBuyerRefundRequests: (filters: Record<string, unknown>, config?: Record<string, unknown>) => Promise<BuyerRefundRequestRecord[]>
      updateBuyerRefundRequests: (input: Record<string, unknown>) => Promise<BuyerRefundRequestRecord[] | BuyerRefundRequestRecord>
    }
    const request = (await service.listBuyerRefundRequests({
      id: [req.params.request_id],
      order_id: [orderId],
      customer_id: [customerId],
    }, { take: 1 }))[0]
    if (!request?.id) return res.status(404).json({ error: { code: "REFUND_REQUEST_NOT_FOUND", message: "Refund request was not found." } })
    const body = (req.body ?? {}) as Record<string, unknown>
    const action = typeof body.action === "string" ? body.action : ""
    if (action === "cancel") {
      if (request.status === "cancelled") return res.status(200).json({ refund_request: serializeBuyerRefundRequest(request) })
      if (!["pending", "requested", "manual_review", "awaiting_information"].includes(String(request.status))) {
        return res.status(409).json({ error: { code: "REFUND_REQUEST_LOCKED", message: "This refund request can no longer be cancelled." } })
      }
      const updated = await service.updateBuyerRefundRequests({ id: request.id, status: "cancelled" })
      return res.status(200).json({ refund_request: serializeBuyerRefundRequest(Array.isArray(updated) ? updated[0] : updated) })
    }
    if (action === "provide_information") {
      if (request.status !== "awaiting_information") {
        return res.status(409).json({ error: { code: "REFUND_REQUEST_INFORMATION_NOT_REQUIRED", message: "Additional information is not currently required." } })
      }
      const note = typeof body.note === "string" ? body.note.trim() : ""
      if (!note || note.length > 1000 || /[<>]/.test(note)) {
        return res.status(400).json({ error: { code: "REFUND_REQUEST_NOTE_INVALID", message: "Provide a valid note of 1000 characters or fewer." } })
      }
      const updated = await service.updateBuyerRefundRequests({
        id: request.id,
        status: "manual_review",
        note,
        decision_reason: "Buyer provided additional information.",
      })
      return res.status(200).json({ refund_request: serializeBuyerRefundRequest(Array.isArray(updated) ? updated[0] : updated) })
    }
    return res.status(400).json({ error: { code: "REFUND_REQUEST_ACTION_INVALID", message: "Use cancel or provide_information." } })
  } catch (error) {
    if (error instanceof OrderStoreAccessError) {
      return res.status(403).json({ error: { code: error.code, message: error.message } })
    }
    console.error("[buyer-refund-action] failed", { message: error instanceof Error ? error.message : "unknown" })
    return res.status(400).json({ error: { code: "REFUND_REQUEST_ACTION_FAILED", message: "Unable to update the refund request." } })
  }
}
