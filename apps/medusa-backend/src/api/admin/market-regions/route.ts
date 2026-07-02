import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ensureMarketRegions, listMarketRegionSummaries } from "../../../lib/product-regions"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const ensure = req.query.ensure === "true"
  const regions = ensure ? await ensureMarketRegions(req.scope) : await listMarketRegionSummaries(req.scope)

  return res.json({
    count: regions.length,
    regions,
  })
}
