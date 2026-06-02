export type ProductReviewRecord = {
  id?: string
  store_id?: string
  product_id?: string
  order_id?: string
  order_display_id?: number
  customer_email?: string
  customer_name?: string | null
  rating?: number
  title?: string | null
  content?: string | null
  status?: string
  metadata?: Record<string, unknown> | null
  created_at?: string | Date
  updated_at?: string | Date
}

export type RatingBreakdown = {
  "5": number
  "4": number
  "3": number
  "2": number
  "1": number
}

export type ProductReviewSummary = {
  average_rating: number | null
  review_count: number
  rating_breakdown: RatingBreakdown
}

export const emptyRatingBreakdown = (): RatingBreakdown => ({
  "5": 0,
  "4": 0,
  "3": 0,
  "2": 0,
  "1": 0,
})

export const isValidReviewRating = (rating: unknown): rating is number =>
  typeof rating === "number" &&
  Number.isInteger(rating) &&
  rating >= 1 &&
  rating <= 5

export const summarizeProductReviews = (
  reviews: Array<Pick<ProductReviewRecord, "rating">>
): ProductReviewSummary => {
  const rating_breakdown = emptyRatingBreakdown()
  let sum = 0
  let review_count = 0

  for (const review of reviews) {
    if (!isValidReviewRating(review.rating)) {
      continue
    }
    const key = String(review.rating) as keyof RatingBreakdown
    rating_breakdown[key] += 1
    sum += review.rating
    review_count += 1
  }

  return {
    average_rating:
      review_count > 0 ? Math.round((sum / review_count) * 10) / 10 : null,
    review_count,
    rating_breakdown,
  }
}

export const normalizeProductReview = (review: ProductReviewRecord) => ({
  review_id: review.id,
  store_id: review.store_id,
  product_id: review.product_id,
  order_id: review.order_id,
  order_display_id: review.order_display_id,
  customer_name: review.customer_name || "Verified buyer",
  rating: review.rating,
  title: review.title ?? null,
  content: review.content ?? null,
  status: review.status,
  metadata: review.metadata ?? {},
  created_at: review.created_at,
  updated_at: review.updated_at,
})

export const maskReviewEmail = (email: string): string => {
  const [name, domain] = email.split("@")
  if (!name || !domain) {
    return "Verified buyer"
  }
  const visible = name.slice(0, Math.min(2, name.length))
  return `${visible}${"*".repeat(Math.max(3, name.length - visible.length))}@${domain}`
}

export const readMcProductIdsFromOrder = (order: Record<string, unknown>): string[] => {
  const items = Array.isArray(order.items) ? order.items : []
  const ids = new Set<string>()

  for (const item of items) {
    const metadata = (item as Record<string, unknown>).metadata as
      | Record<string, unknown>
      | null
      | undefined
    const mcProductId = metadata?.mc_product_id
    if (typeof mcProductId === "string" && mcProductId.length > 0) {
      ids.add(mcProductId)
    }
  }

  return [...ids]
}

export const parseReviewText = (
  value: unknown,
  maxLength: number
): string | null | undefined => {
  if (value === undefined || value === null || value === "") {
    return null
  }
  if (typeof value !== "string") {
    return undefined
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }
  return trimmed.length <= maxLength ? trimmed : undefined
}
