import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../lib/store-context"
import { normalizeProductReview, summarizeProductReviews } from "../../../lib/product-reviews"
import { getStoreCoreService } from "../../_helpers/store-core"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const storeId = resolveCurrentStore(req).store_id
  const service = getStoreCoreService(req)
  const products = await service.listProducts({ store_id: storeId, status: "published" })
  const ids = new Set(products.map((product: any) => product.id))
  const reviews = await service.listProductReviews({ store_id: storeId, status: "published" }, { order: { created_at: "DESC" } })
  const visible = reviews.filter((review: any) => ids.has(review.product_id))
  const summary = summarizeProductReviews(visible)
  const titles = new Map(products.map((product: any) => [product.id, product.title]))
  return res.json({
    store_id: storeId,
    average_rating: summary.average_rating,
    review_count: summary.review_count,
    rating_breakdown: summary.rating_breakdown,
    reviews: visible.map((review: any) => ({ ...normalizeProductReview(review), product_title: titles.get(review.product_id) ?? null })),
  })
}
