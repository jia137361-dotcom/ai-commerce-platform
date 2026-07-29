import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ensureMarketRegions } from "../../../lib/product-regions"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const regions = await ensureMarketRegions(req.scope)
  return res.json({
    count: regions.length,
    regions,
  })
}
