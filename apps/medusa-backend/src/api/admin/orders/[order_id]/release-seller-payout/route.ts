import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../../../lib/store-context"
import { assertOrderBelongsToCurrentStore } from "../../../../../lib/order-store-context"
import { OrderStoreAccessError } from "../../../../../lib/order-store-error"
import { loadAdminOrderRecord } from "../../../../../lib/admin-orders"
import { releaseSellerPayout } from "../../../../../lib/seller-order-payout"
import { sendError } from "../../../../_helpers/store-core"

/**
 * Repairs settlement for a receipt-confirmed order created before Connect
 * payout metadata was available. New orders are released automatically from
 * the buyer confirmation route.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const orderId = String(req.params.order_id ?? "")
    const order = await loadAdminOrderRecord(req.scope, orderId)
    assertOrderBelongsToCurrentStore(req, order)
    const confirmedAt = order.metadata?.buyer_confirmed_received_at
    if (typeof confirmedAt !== "string" || !confirmedAt.trim()) {
      return res.status(409).json({
        error: {
          code: "RECEIPT_NOT_CONFIRMED",
          message: "Seller settlement is available after the buyer confirms receipt.",
        },
      })
    }

    const payout = await releaseSellerPayout(req.scope, orderId, "onboarding_retry")
    return res.status(200).json({ order_id: orderId, seller_payout: payout })
  } catch (error) {
    if (error instanceof OrderStoreAccessError) {
      return sendError(res, 403, error.code, error.message)
    }
    const message = error instanceof Error ? error.message : "Unable to release seller settlement"
    console.error("[release-seller-payout] failed", { order_id: req.params.order_id, message })
    return res.status(500).json({
      error: { code: "SELLER_PAYOUT_RELEASE_FAILED", message },
    })
  }
}
