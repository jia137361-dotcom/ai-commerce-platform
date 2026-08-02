import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { resolveAdminUserId } from "../../../lib/platform-admin/require-platform-operator"
import { resolveSellerSession } from "../../../lib/seller-register"
import { BUYER_REFUND_REQUESTS_MODULE } from "../../../modules/buyer-refund-requests"
import { serializeBuyerRefundRequest, type BuyerRefundRequestRecord } from "../../../lib/order-refund-request"
import { sendError } from "../../_helpers/store-core"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const userId = resolveAdminUserId(req)
  if (!userId) return sendError(res, 401, "UNAUTHORIZED", "Seller authentication required")
  const session = await resolveSellerSession(req.scope, userId)
  if (!session.store_id) return sendError(res, 404, "STORE_NOT_FOUND", "No seller store is linked to this account")
  const service = req.scope.resolve(BUYER_REFUND_REQUESTS_MODULE) as {
    listBuyerRefundRequests: (filters: Record<string, unknown>, config?: Record<string, unknown>) => Promise<BuyerRefundRequestRecord[]>
  }
  const status = typeof req.query?.status === "string" ? req.query.status : undefined
  const filters: Record<string, unknown> = { store_id: [session.store_id] }
  if (status) filters.status = [status]
  const requests = await service.listBuyerRefundRequests(filters, { order: { created_at: "DESC" }, take: 100 })
  const orderIds = [...new Set(requests.map((request) => request.order_id).filter((id): id is string => Boolean(id)))]
  const orderModule = req.scope.resolve(Modules.ORDER) as unknown as {
    listOrders: (filters: Record<string, unknown>, config?: Record<string, unknown>) => Promise<Array<Record<string, unknown>>>
  }
  const orders = orderIds.length
    ? await orderModule.listOrders({ id: orderIds }, { relations: ["items"], take: orderIds.length })
    : []
  const orderById = new Map(orders.map((order) => [String(order.id), order]))
  const rows = requests.map((request) => {
    const order = request.order_id ? orderById.get(request.order_id) : null
    const orderItems = Array.isArray(order?.items) ? order.items as Array<Record<string, unknown>> : []
    const selectedItems = Array.isArray(request.requested_items)
      ? request.requested_items as Array<Record<string, unknown>>
      : orderItems.map((item) => ({ item_id: item.id, quantity: item.quantity }))
    return {
      ...serializeBuyerRefundRequest(request),
      customer_id: request.customer_id ?? null,
      fulfillment_status: order?.fulfillment_status ?? null,
      items: selectedItems.map((selected) => {
        const itemId = String(selected.item_id ?? selected.id ?? "")
        const item = orderItems.find((candidate) => candidate.id === itemId)
        return {
          item_id: itemId,
          title: typeof item?.title === "string" ? item.title : "Order item",
          quantity: Number(selected.quantity ?? 0),
        }
      }),
    }
  })
  return res.status(200).json({ store_id: session.store_id, refund_requests: rows })
}
