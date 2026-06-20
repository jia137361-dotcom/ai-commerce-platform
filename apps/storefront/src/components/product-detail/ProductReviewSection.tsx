import type { BuyerReviewsSummary, DataSource } from "../../lib/buyer-api"
import { Card } from "../ui/Card"
import { EmptyState } from "../ui/States"
import { StatusBadge } from "../ui/StatusBadge"

type ProductReviewSectionProps = { summary?: BuyerReviewsSummary | null; source: DataSource; error?: string }

export function ProductReviewSection({ summary, source, error }: ProductReviewSectionProps) {
  if (source !== "backend") {
    return <section className="buyer-product-reviews" id="reviews"><EmptyState title="Reviews unavailable" message={error ? "The reviews service could not be reached." : "Reviews are not available for this product."} /></section>
  }
  const reviewCount = summary?.reviewCount ?? summary?.reviews.length ?? 0
  if (!summary || !reviewCount) {
    return <section className="buyer-product-reviews" id="reviews"><EmptyState title="No reviews yet" message="Be the first to share an experience after purchasing this product." /></section>
  }
  return (
    <section className="buyer-product-reviews" id="reviews">
      <header><div><p>Buyer feedback</p><h2>Customer reviews</h2></div><div className="buyer-product-review-score"><strong>{summary.averageRating?.toFixed(1) ?? "Not rated"}</strong><span>{reviewCount} reviews</span></div></header>
      <div className="buyer-product-review-list">
        {summary.reviews.slice(0, 3).map((review) => <div key={review.id}><Card as="article">
          <div><strong>{review.customerName}</strong><StatusBadge tone="warning">{review.rating}/5</StatusBadge></div>
          {review.title ? <h3>{review.title}</h3> : null}<p>{review.content}</p><small>{review.createdAt ?? "Date unavailable"}</small>
        </Card></div>)}
      </div>
    </section>
  )
}
