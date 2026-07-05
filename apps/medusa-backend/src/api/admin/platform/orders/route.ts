import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { requirePlatformOperator } from "../../../../lib/platform-admin/require-platform-operator"
import { listPlatformOrders } from "../../../../lib/platform-admin/platform-stores-orders"
import { parsePagination } from "../../../../lib/platform-admin/platform-utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const operator = await requirePlatformOperator(req, res)
  if (!operator) return

  const query = (req.query ?? {}) as Record<string, unknown>
  const { limit, offset } = parsePagination(query)
  const storeId = typeof query.store_id === "string" ? query.store_id : undefined
  const email = typeof query.email === "string" ? query.email : undefined
  const result = await listPlatformOrders(req.scope, { limit, offset, storeId, email })
  return res.json(result)
}
