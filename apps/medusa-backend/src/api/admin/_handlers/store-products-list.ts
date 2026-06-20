import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../lib/store-context"
import {
  applyProductStatusFilter,
  buildProductListFilters,
  filterProductsByTitle,
  paginateList,
  parseAdminProductListQuery,
} from "../../../lib/admin-products"
import {
  getStoreCoreService,
  normalizeProduct,
  sendError,
} from "../../_helpers/store-core"

/** List mc_product rows for the current store (safe from Medusa native `/admin/products`). */
export const listStoreProductsHandler = async (req: MedusaRequest, res: MedusaResponse) => {
  const { store_id: storeId } = resolveCurrentStore(req)

  let query
  try {
    query = parseAdminProductListQuery((req.query ?? {}) as Record<string, unknown>)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Invalid query"
    return sendError(res, 400, "VALIDATION_ERROR", message)
  }

  const storeCoreService = getStoreCoreService(req)
  const filters = buildProductListFilters(storeId, query.status)

  const allProducts = await storeCoreService.listProducts(filters, {
    order: { updated_at: "DESC" },
  })

  const byStatus = applyProductStatusFilter(
    allProducts as Array<{ title?: string | null; status?: string | null }>,
    query.status
  )
  const filtered = filterProductsByTitle(byStatus, query.q)
  const { items, count } = paginateList(filtered, query.offset, query.limit)

  return res.json({
    store_id: storeId,
    count,
    limit: query.limit,
    offset: query.offset,
    products: items.map((product: Record<string, unknown>) => normalizeProduct(product)),
  })
}
