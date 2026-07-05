import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { listMarketplaceProducts } from "../../../../lib/marketplace/public-marketplace"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.query as { limit?: string; offset?: string; q?: string; store_id?: string }
  const result = await listMarketplaceProducts(req.scope, {
    limit: query.limit ? Number.parseInt(query.limit, 10) : undefined,
    offset: query.offset ? Number.parseInt(query.offset, 10) : undefined,
    q: query.q,
    store_id: query.store_id,
  })

  return res.json(result)
}
