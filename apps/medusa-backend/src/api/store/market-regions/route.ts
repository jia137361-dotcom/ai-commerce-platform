import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { listMarketRegionSummaries } from "../../../lib/product-regions"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const regions = await listMarketRegionSummaries(req.scope)
  return res.json({
    count: regions.length,
    regions,
  })
}
