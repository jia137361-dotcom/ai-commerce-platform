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

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const productId = (req.params.id ?? req.params.product_id) as string
  const { store_id: storeId } = resolveCurrentStore(req)
  const storeCoreService = getStoreCoreService(req)

  const products = await storeCoreService.listProducts({
    id: productId,
    store_id: storeId,
    status: "published"
  })

  const product = products[0]

  if (!product) {
    return sendError(res, 404, "PRODUCT_NOT_FOUND", "Product not found")
  }

  const productWithShipping = {
    ...product,
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
