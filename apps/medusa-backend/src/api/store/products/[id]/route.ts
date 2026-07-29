import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../../lib/store-context"
import { resolveProductRequiresShipping } from "../../../../lib/product-shipping"
import { attachSupportedRegionsToProduct } from "../../../../lib/product-regions"
import {
  getProductReviewSummaries,
  getStoreCoreService,
  normalizeProductWithReviewSummary,
  sendError
} from "../../../_helpers/store-core"
import { isStorefrontProductVisible } from "../../../../lib/storefront-product-visibility"

const storefrontProductPayload = (product: any) => ({
  ...product,
  variants: Array.isArray(product.variants)
    ? product.variants.filter((variant: any) => variant?.enabled !== false)
    : product.variants,
})

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const productId = (req.params.id ?? req.params.product_id) as string
  const query = req.query as { store_id?: string; store?: string }
  const queryStoreId = query.store_id?.trim() || query.store?.trim()
  const { store_id: headerStoreId } = resolveCurrentStore(req)
  const storeId = queryStoreId || headerStoreId
  const storeCoreService = getStoreCoreService(req)

  let products = await storeCoreService.listProducts({
    id: productId,
    store_id: storeId,
  })

  // Order lines sometimes expose Medusa native product ids; resolve store-core via bridge.
  if (!products[0]) {
    products = await storeCoreService.listProducts({
      medusa_product_id: productId,
      store_id: storeId,
    })
  }

  const product = products[0]

  if (!product || !isStorefrontProductVisible(product as Record<string, unknown>)) {
    return sendError(res, 404, "PRODUCT_NOT_FOUND", "Product not found")
  }

  const productWithShipping = {
    ...storefrontProductPayload(product),
    requires_shipping: resolveProductRequiresShipping(product as Record<string, unknown>),
  }
  const productWithRegions = await attachSupportedRegionsToProduct(req.scope, productWithShipping)
  const summaries = await getProductReviewSummaries(storeCoreService, storeId, [product.id])
  const categories = product.category_ids?.length
    ? await storeCoreService.listProductCategories({ id: product.category_ids, store_id: storeId })
    : []

  return res.json({
    product: {
      ...normalizeProductWithReviewSummary(productWithRegions, summaries.get(product.id)),
      supported_regions: productWithRegions.supported_regions,
      category_name: categories[0]?.name ?? null,
    },
  })
}
