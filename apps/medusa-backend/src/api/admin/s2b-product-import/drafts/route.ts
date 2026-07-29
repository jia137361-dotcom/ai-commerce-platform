import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../../lib/store-context"
import { listImportedDrafts } from "../../../../lib/s2b-product-import/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { store_id: storeId } = resolveCurrentStore(req)
  const filters = {
    status: req.query.status,
    category: req.query.category,
    product_type: req.query.product_type,
    warehouse_region: req.query.warehouse_region,
    country: req.query.country,
  }
  const result = await listImportedDrafts({ container: req.scope, storeId, filters })
  return res.status(200).json(result)
}
