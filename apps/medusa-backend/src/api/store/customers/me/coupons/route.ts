import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCustomerId } from "../../../../../lib/customer-session"
import { resolveCurrentStore } from "../../../../../lib/store-context"
import { listBuyerWalletCoupons } from "../../../../../lib/store-coupons"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const customerId = resolveCustomerId(req)
  if (!customerId) {
    return res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Customer session is required" },
    })
  }

  try {
    const { store_id: storeId } = resolveCurrentStore(req)
    const bucket = typeof req.query.bucket === "string" ? req.query.bucket : "all"
    const coupons = await listBuyerWalletCoupons(req.scope, storeId, customerId, {
      bucket,
      storeName: "ciiverse",
    })
    return res.json({
      store_id: storeId,
      count: coupons.length,
      coupons,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load coupons"
    return res.status(500).json({ error: { code: "COUPON_LIST_ERROR", message } })
  }
}
