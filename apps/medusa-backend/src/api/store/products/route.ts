import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
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

  return res.json({
    store_id: storeId,
    count: products.length,
    products: products.map((product: any) =>
      normalizeProductWithReviewSummary(product, summaries.get(product.id))
    )
  })
}

