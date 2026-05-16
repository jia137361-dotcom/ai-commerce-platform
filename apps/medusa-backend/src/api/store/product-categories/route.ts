import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../lib/store-context"
import { getStoreCoreService, normalizeCategory } from "../../_helpers/store-core"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { store_id: storeId } = resolveCurrentStore(req)
  const storeCoreService = getStoreCoreService(req)

  const categories = await storeCoreService.listProductCategories(
    { store_id: storeId },
    { order: { sort_order: "ASC" } }
  )

  return res.json({
    store_id: storeId,
    count: categories.length,
    categories: categories.map((c) => normalizeCategory(c as Record<string, unknown>)),
  })
}
