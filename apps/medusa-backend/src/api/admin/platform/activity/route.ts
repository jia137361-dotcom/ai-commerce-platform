import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { requirePlatformOperator } from "../../../../lib/platform-admin/require-platform-operator"
import { listPlatformActivity } from "../../../../lib/platform-admin/platform-activity"
import { parsePagination } from "../../../../lib/platform-admin/platform-utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const operator = await requirePlatformOperator(req, res)
  if (!operator) return

  const query = (req.query ?? {}) as Record<string, unknown>
  const { limit, offset } = parsePagination(query)
  const result = await listPlatformActivity(req.scope, { limit, offset })
  return res.json(result)
}
