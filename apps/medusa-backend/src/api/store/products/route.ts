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
  const shipFrom = req.query.ship_from as string | undefined

  const filters: Record<string, unknown> = {
    store_id: storeId,
    status: "published"
  }

  if (shipFrom) {
    filters.ship_from_country = shipFrom
  }

  const products = await storeCoreService.listProducts(
    filters,
    {
      order: {
        created_at: "DESC"
      }
    }
  )

  // Buyer Custom Designs become published after order, but stay out of the store catalog.
  const catalogProducts = products.filter((product: any) => {
    const metadata =
      product.metadata && typeof product.metadata === "object"
        ? (product.metadata as Record<string, unknown>)
        : {}
    return !(metadata.buyer_design === true || metadata.design_source === "buyer_sdk")
  })

  const summaries = await getProductReviewSummaries(
    storeCoreService,
    storeId,
    catalogProducts.map((product: any) => product.id)
  )
  const categories = await storeCoreService.listProductCategories({ store_id: storeId })
  const categoryNames = new Map(categories.map((category: any) => [category.id, category.name]))
  const productsWithShipping = catalogProducts.map((product: any) => ({
    ...product,
    requires_shipping: resolveProductRequiresShipping(product as Record<string, unknown>),
  }))
  const productsWithRegions = await attachSupportedRegionsToProducts(req.scope, productsWithShipping)

  return res.json({
    store_id: storeId,
    count: catalogProducts.length,
    products: productsWithRegions.map((product: any) => ({
      ...normalizeProductWithReviewSummary(product, summaries.get(product.id)),
      supported_regions: product.supported_regions,
      category_name: product.category_ids?.[0] ? categoryNames.get(product.category_ids[0]) ?? null : null,
    })),
  })
}
