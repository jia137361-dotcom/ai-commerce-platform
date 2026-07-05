import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { resolveCurrentStore } from "../../../../../../../lib/store-context"
import { readOrderStoreId } from "../../../../../../../lib/order-store-context"
import { canConfirmReceipt } from "../../../../../../../lib/buyer-order-display"
import { resolveBuyerOrderFulfillmentStatus } from "../../../../../../../lib/order-custom-metadata"
import { releaseSellerPayout } from "../../../../../../../lib/seller-order-payout"

type AuthenticatedRequest = MedusaRequest & { auth_context?: { actor_id?: string } }

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const customerId = (req as AuthenticatedRequest).auth_context?.actor_id
  if (!customerId) return res.status(401).json({ error: "Customer session is required" })

  const orderModule = req.scope.resolve(Modules.ORDER)
  const order = await orderModule.retrieveOrder(req.params.order_id as string)
  if (order.customer_id !== customerId || readOrderStoreId(order) !== resolveCurrentStore(req).store_id) {
    return res.status(404).json({ error: "Order not found" })
  }

  const metadata = (order.metadata ?? {}) as Record<string, unknown>
  const fulfillmentStatus = resolveBuyerOrderFulfillmentStatus(metadata)
  if (!canConfirmReceipt({ fulfillmentStatus, receiptConfirmed: false })) {
    return res.status(409).json({ error: "Receipt can be confirmed only after the order has shipped" })
  }

  const confirmedAt = typeof metadata.buyer_confirmed_received_at === "string"
    ? metadata.buyer_confirmed_received_at
    : new Date().toISOString()
  await orderModule.updateOrders(order.id, {
    status: "completed",
    metadata: {
      ...metadata,
      buyer_confirmed_received_at: confirmedAt,
      receipt_confirmation_source: "buyer",
    },
  } as never)

  let sellerPayout = null
  try {
    sellerPayout = await releaseSellerPayout(req.scope, order.id, "buyer_confirm")
  } catch (error) {
    console.error("[confirm-received] seller payout failed:", error)
  }

  return res.json({
    order_id: order.id,
    status: "completed",
    confirmed_at: confirmedAt,
    seller_payout: sellerPayout,
  })
}
