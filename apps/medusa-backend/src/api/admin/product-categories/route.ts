import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../lib/store-context"
import {
  getStoreCoreService,
  normalizeCategory,
  requireText,
  sendError
} from "../../_helpers/store-core"

type CreateProductCategoryBody = {
  name?: string
  description?: string
  parent_id?: string | null
  sort_order?: number
}

export const POST = async (
  req: MedusaRequest<CreateProductCategoryBody>,
  res: MedusaResponse
) => {
  const body = req.body ?? {}
  const name = requireText(body.name)

  if (!name) {
    return sendError(res, 400, "VALIDATION_ERROR", "name is required")
  }

  const { store_id: storeId } = resolveCurrentStore(req)
  const storeCoreService = getStoreCoreService(req)

  const stores = await storeCoreService.listStores({ id: storeId })

  if (!stores.length) {
    return sendError(res, 404, "STORE_NOT_FOUND", "Store not found")
  }

  const slug = name.toLowerCase().replace(/\s+/g, "-")

  const category = await storeCoreService.createProductCategories({
    store_id: storeId,
    name,
    slug,
    description: body.description ?? null,
    parent_id: body.parent_id ?? null,
    sort_order: typeof body.sort_order === "number" ? body.sort_order : 0
  })

  return res.status(201).json({
    category_id: category.id,
    store_id: category.store_id,
    category: normalizeCategory(category)
  })
}

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
    categories: categories.map(normalizeCategory)
  })
}
