import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../lib/store-context"
import {
  listProductCategoriesForStore,
  normalizeCategory,
} from "../../_helpers/store-core"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { store_id: storeId } = resolveCurrentStore(req)
  const categories = await listProductCategoriesForStore(req, storeId)

  return res.json({
    store_id: storeId,
    count: categories.length,
    categories: categories.map((c) => normalizeCategory(c)),
  })
}
