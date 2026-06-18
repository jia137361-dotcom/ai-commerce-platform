import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { resolveCurrentStore } from "../../../lib/store-context"
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
  const productModule = req.scope.resolve(Modules.PRODUCT)
  const productsWithShipping = await Promise.all(
    products.map(async (product: any) => {
      if (!product.medusa_variant_id) {
        return product
      }

      try {
        const variant = await productModule.retrieveProductVariant(product.medusa_variant_id, {
          select: ["id", "requires_shipping"],
        })
        return {
          ...product,
          requires_shipping:
            typeof variant?.requires_shipping === "boolean"
              ? variant.requires_shipping
              : undefined,
        }
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[store-products] unable to read variant requires_shipping", {
            product_id: product.id,
            medusa_variant_id: product.medusa_variant_id,
            message: error instanceof Error ? error.message : String(error),
          })
        }
        return product
      }
    })
  )

  return res.json({
    store_id: storeId,
    count: products.length,
    products: productsWithShipping.map((product: any) =>
      normalizeProductWithReviewSummary(product, summaries.get(product.id))
    )
  })
}
