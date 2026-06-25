import { useEffect, useMemo, useRef } from "react"
import type { BuyerReviewsSummary, DataSource } from "../../lib/buyer-api"
import { OrderReviewFormPanel } from "../reviews/OrderReviewDialog"
import { Card } from "../ui/Card"
import { EmptyState } from "../ui/States"
import { StatusBadge } from "../ui/StatusBadge"

type ProductReviewSectionProps = {
  summary?: BuyerReviewsSummary | null
  source: DataSource
  error?: string
  review?: { productId: string; orderNumber: string; email: string; customerName?: string; productTitle?: string }
  viewReviewOrderNumber?: string | null
  onSubmitted?: () => void
}

const formatReviewRatings = (review: BuyerReviewsSummary["reviews"][number]) => {
  const parts = [`Product ${review.rating}/5`]
  if (review.logisticsRating) parts.push(`Shipping ${review.logisticsRating}/5`)
  if (review.overallRating) parts.push(`Overall ${review.overallRating}/5`)
  return parts.join(" · ")
}

const matchesViewReviewOrder = (
  review: BuyerReviewsSummary["reviews"][number],
  viewReviewOrderNumber: string
) => {
  const target = viewReviewOrderNumber.trim()
  if (!target) return false
  return (
    String(review.orderDisplayId ?? "") === target ||
    String(review.orderId ?? "") === target
  )
}

const buildDisplayedReviews = (
  reviews: BuyerReviewsSummary["reviews"],
  viewReviewOrderNumber?: string | null
) => {
  if (!viewReviewOrderNumber) {
    return reviews.slice(0, 3)
  }

  const match = reviews.find((entry) => matchesViewReviewOrder(entry, viewReviewOrderNumber))
  if (!match) {
    return reviews.slice(0, 3)
  }

  const others = reviews.filter((entry) => entry.id !== match.id).slice(0, 2)
  return [match, ...others]
}

export function ProductReviewSection({ summary, source, error, review, viewReviewOrderNumber, onSubmitted }: ProductReviewSectionProps) {
  const highlightedReviewRef = useRef<HTMLDivElement | null>(null)
  const displayedReviews = useMemo(
    () => buildDisplayedReviews(summary?.reviews ?? [], viewReviewOrderNumber),
    [summary?.reviews, viewReviewOrderNumber]
  )
  const highlightedReview = viewReviewOrderNumber
    ? displayedReviews.find((entry) => matchesViewReviewOrder(entry, viewReviewOrderNumber))
    : undefined

  useEffect(() => {
    if (!highlightedReview) return
    highlightedReviewRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [highlightedReview?.id])

  const form = review ? (
    <OrderReviewFormPanel
      target={{
        productId: review.productId,
        productTitle: review.productTitle ?? "this product",
        orderNumber: review.orderNumber,
        email: review.email,
        customerName: review.customerName,
      }}
      onSubmitted={onSubmitted}
    />
  ) : null

  if (source !== "backend") {
    return <section className="buyer-product-reviews" id="reviews"><EmptyState title="Reviews unavailable" message={error ? "The reviews service could not be reached." : "Reviews are not available for this product."} /></section>
  }
  const reviewCount = summary?.reviewCount ?? summary?.reviews.length ?? 0
  if (!summary || !reviewCount) {
    return <section className="buyer-product-reviews" id="reviews">{form}<EmptyState title="No reviews yet" message="Be the first to share an experience after purchasing this product." /></section>
  }
  return (
    <section className="buyer-product-reviews" id="reviews">
      {form}
      <header><div><p>Buyer feedback</p><h2>Customer reviews</h2></div><div className="buyer-product-review-score"><strong>{summary.averageRating?.toFixed(1) ?? "Not rated"}</strong><span>{reviewCount} reviews</span></div></header>
      <div className="buyer-product-review-list">
        {displayedReviews.map((entry) => {
          const highlighted = Boolean(
            viewReviewOrderNumber && matchesViewReviewOrder(entry, viewReviewOrderNumber)
          )
          return (
          <div
            key={entry.id}
            ref={highlighted ? highlightedReviewRef : undefined}
            className={highlighted ? "buyer-product-review-highlight" : undefined}
          >
            <Card as="article">
              <div><strong>{entry.customerName}</strong><StatusBadge tone="warning">{formatReviewRatings(entry)}</StatusBadge></div>
              {entry.title ? <h3>{entry.title}</h3> : null}
              {entry.content ? <p>{entry.content}</p> : null}
              {entry.imageUrls?.length ? (
                <ul className="buyer-order-review-image-list">
                  {entry.imageUrls.map((url) => (
                    <li key={url}><img src={url} alt="" /></li>
                  ))}
                </ul>
              ) : null}
              <small>{entry.createdAt ?? "Date unavailable"}</small>
            </Card>
          </div>
          )
        })}
      </div>
    </section>
  )
}
