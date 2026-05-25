import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { syncPendingSupplierOrders } from "../../../../lib/s2bdiy/sync-supplier-orders"
import { getS2bdiyConfig } from "../../../../lib/s2bdiy"
import { sendError } from "../../../_helpers/store-core"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  if (!getS2bdiyConfig()) {
    return sendError(res, 400, "VALIDATION_ERROR", "S2BDIY is not configured")
  }
  try {
    const synced = await syncPendingSupplierOrders(req.scope)
    return res.json({ synced })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "sync failed"
    return sendError(res, 502, "PAYMENT_FAILED", message)
  }
}
