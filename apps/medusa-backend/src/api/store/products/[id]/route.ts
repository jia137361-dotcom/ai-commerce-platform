import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { resolveCurrentStore } from "../../../../lib/store-context"
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

  let productWithShipping = product
  if (product.medusa_variant_id) {
    try {
      const productModule = req.scope.resolve(Modules.PRODUCT)
      const variant = await productModule.retrieveProductVariant(product.medusa_variant_id, {
        select: ["id", "requires_shipping"],
      })
      productWithShipping = {
        ...product,
        requires_shipping:
          typeof variant?.requires_shipping === "boolean"
            ? variant.requires_shipping
            : undefined,
      }
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[store-product-detail] unable to read variant requires_shipping", {
          product_id: product.id,
          medusa_variant_id: product.medusa_variant_id,
          message: error instanceof Error ? error.message : String(error),
        })
      }
    }
  }

  const summaries = await getProductReviewSummaries(storeCoreService, storeId, [
    product.id
  ])

  return res.json({
    product: normalizeProductWithReviewSummary(productWithShipping, summaries.get(product.id))
  })
}
