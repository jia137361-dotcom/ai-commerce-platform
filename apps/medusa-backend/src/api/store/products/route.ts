import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../lib/store-context"
import { resolveProductRequiresShipping } from "../../../lib/product-shipping"
import { attachSupportedRegionsToProducts } from "../../../lib/product-regions"
import {
  getProductReviewSummaries,
  getStoreCoreService,
  normalizeProductWithReviewSummary
} from "../../_helpers/store-core"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { store_id: storeId } = resolveCurrentStore(req)
  const storeCoreService = getStoreCoreService(req)

  const products = await storeCoreService.listProducts(
    {
      store_id: storeId,
      status: "published"
    },
    {
      order: {
        created_at: "DESC"
      }
    }
  )

  const summaries = await getProductReviewSummaries(
    storeCoreService,
    storeId,
    products.map((product: any) => product.id)
  )
  const categories = await storeCoreService.listProductCategories({ store_id: storeId })
  const categoryNames = new Map(categories.map((category: any) => [category.id, category.name]))
  const productsWithShipping = products.map((product: any) => ({
    ...product,
    requires_shipping: resolveProductRequiresShipping(product as Record<string, unknown>),
  }))
  const productsWithRegions = await attachSupportedRegionsToProducts(req.scope, productsWithShipping)

  return res.json({
    store_id: storeId,
    count: products.length,
    products: productsWithRegions.map((product: any) => ({
      ...normalizeProductWithReviewSummary(product, summaries.get(product.id)),
      supported_regions: product.supported_regions,
      category_name: product.category_ids?.[0] ? categoryNames.get(product.category_ids[0]) ?? null : null,
    })),
  })
}
