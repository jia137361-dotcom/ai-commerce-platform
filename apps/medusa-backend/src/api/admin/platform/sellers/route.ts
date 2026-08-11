import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { requirePlatformOperator } from "../../../../lib/platform-admin/require-platform-operator"
import { listPlatformSellers } from "../../../../lib/platform-admin/platform-directory"
import { parsePagination } from "../../../../lib/platform-admin/platform-utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const operator = await requirePlatformOperator(req, res)
  if (!operator) return

  const query = (req.query ?? {}) as Record<string, unknown>
  const { limit, offset } = parsePagination(query)
  const q = typeof query.q === "string" ? query.q : undefined
  const result = await listPlatformSellers(req.scope, { limit, offset, q })
  return res.json(result)
}
