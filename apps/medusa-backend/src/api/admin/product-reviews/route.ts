import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../lib/store-context"
import { normalizeProductReview, summarizeProductReviews } from "../../../lib/product-reviews"
import { getStoreCoreService } from "../../_helpers/store-core"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { store_id: storeId } = resolveCurrentStore(req)
  const service = getStoreCoreService(req)
  const limitRaw = Number(req.query?.limit ?? 50)
  const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 50, 1), 200)
  const offsetRaw = Number(req.query?.offset ?? 0)
  const offset = Math.max(Number.isFinite(offsetRaw) ? offsetRaw : 0, 0)
  const productId =
    typeof req.query?.product_id === "string" && req.query.product_id.trim()
      ? req.query.product_id.trim()
      : undefined

  const filters: Record<string, unknown> = { store_id: storeId, status: "published" }
  if (productId) filters.product_id = productId

  const reviews = await (service as any).listProductReviews(filters, {
    order: { created_at: "DESC" },
  })
  const products = await service.listProducts({ store_id: storeId })
  const titles = new Map(products.map((product: any) => [product.id, product.title]))
  const summary = summarizeProductReviews(reviews)
  const page = reviews.slice(offset, offset + limit)

  return res.json({
    store_id: storeId,
    average_rating: summary.average_rating,
    review_count: summary.review_count,
    rating_breakdown: summary.rating_breakdown,
    count: reviews.length,
    limit,
    offset,
    reviews: page.map((review: any) => ({
      ...normalizeProductReview(review),
      product_title: titles.get(review.product_id) ?? null,
    })),
  })
}
