import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { sendError } from "../../../../_helpers/store-core"
import { requirePlatformOperator } from "../../../../../lib/platform-admin/require-platform-operator"
import { getPlatformOrder } from "../../../../../lib/platform-admin/platform-stores-orders"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const operator = await requirePlatformOperator(req, res)
  if (!operator) return

  const orderId = req.params.id as string
  const order = await getPlatformOrder(req.scope, orderId)
  if (!order) {
    return sendError(res, 404, "VALIDATION_ERROR", "Order not found")
  }
  return res.json({ order })
}
