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

export const REVIEW_MAX_IMAGES = 5

export const parseReviewImageUrls = (value: unknown): string[] | undefined => {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) return undefined
  const urls = value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0 && entry.length <= 2048)
    .slice(0, REVIEW_MAX_IMAGES)
  return urls
}

export const readReviewExtendedFields = (
  metadata: Record<string, unknown> | null | undefined
) => {
  const logisticsRating = metadata?.logistics_rating
  const overallRating = metadata?.overall_rating
  const imageUrls = parseReviewImageUrls(metadata?.image_urls) ?? []

  return {
    logistics_rating: isValidReviewRating(logisticsRating) ? logisticsRating : null,
    overall_rating: isValidReviewRating(overallRating) ? overallRating : null,
    image_urls: imageUrls,
  }
}

export const buildReviewMetadata = (input: {
  logistics_rating: number
  overall_rating: number
  image_urls?: string[]
}) => ({
  logistics_rating: input.logistics_rating,
  overall_rating: input.overall_rating,
  image_urls: (input.image_urls ?? []).slice(0, REVIEW_MAX_IMAGES),
})

export const normalizeProductReview = (review: ProductReviewRecord) => {
  const metadata =
    review.metadata && typeof review.metadata === "object"
      ? (review.metadata as Record<string, unknown>)
      : {}
  const extended = readReviewExtendedFields(metadata)

  return {
    review_id: review.id,
    store_id: review.store_id,
    product_id: review.product_id,
    order_id: review.order_id,
    order_display_id: review.order_display_id,
    customer_name: review.customer_name || "Verified buyer",
    rating: review.rating,
    logistics_rating: extended.logistics_rating,
    overall_rating: extended.overall_rating,
    image_urls: extended.image_urls,
    title: review.title ?? null,
    content: review.content ?? null,
    status: review.status,
    metadata,
    created_at: review.created_at,
    updated_at: review.updated_at,
  }
}

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
