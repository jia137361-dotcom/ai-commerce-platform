import type { BuyerReviewsSummary } from "../../lib/buyer-api"
import { Card } from "../ui/Card"

const formatReviewRatings = (review: BuyerReviewsSummary["reviews"][number]) => {
  const parts = [`Product ${review.rating}/5`]
  if (review.logisticsRating) parts.push(`Shipping ${review.logisticsRating}/5`)
  if (review.overallRating) parts.push(`Overall ${review.overallRating}/5`)
  return parts.join(" · ")
}

export function StoreReviewsPanel({ summary, error }: { summary: BuyerReviewsSummary | null; error?: string }) {
  if (error) return <section className="buyer-shop-store-reviews"><h2>Reviews unavailable</h2><p>The review service could not be reached. No fallback reviews are shown.</p></section>
  if (!summary?.reviewCount) return <section className="buyer-shop-store-reviews"><h2>No reviews yet</h2><p>Verified delivered-order reviews will appear here.</p></section>
  return (
    <section className="buyer-shop-store-reviews">
      <header>
        <div><p>Verified buyer feedback</p><h2>Store reviews</h2></div>
        <strong>{summary.averageRating?.toFixed(1)} ★ · {summary.reviewCount} reviews</strong>
      </header>
      <div>
        {summary.reviews.map((review) => (
          <Card as="article" key={review.id}>
            <div><strong>{review.customerName}</strong><span>{formatReviewRatings(review)}</span></div>
            {review.productTitle ? <small>{review.productTitle}</small> : null}
            {review.title ? <h3>{review.title}</h3> : null}
            {review.content ? <p>{review.content}</p> : null}
            {review.imageUrls?.length ? (
              <ul className="buyer-order-review-image-list">
                {review.imageUrls.map((url) => (
                  <li key={url}><img src={url} alt="" /></li>
                ))}
              </ul>
            ) : null}
          </Card>
        ))}
      </div>
    </section>
  )
}
