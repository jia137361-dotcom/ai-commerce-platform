import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { requirePlatformOperator } from "../../../../lib/platform-admin/require-platform-operator"
import { buildPlatformOverview } from "../../../../lib/platform-admin/platform-overview"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const operator = await requirePlatformOperator(req, res)
  if (!operator) return

  const overview = await buildPlatformOverview(req.scope)
  return res.json({ overview })
}
