import type { BuyerReviewsSummary, DataSource } from "../../lib/buyer-api"

type ProductReviewSectionProps = {
  summary: BuyerReviewsSummary
  source: DataSource
  error?: string
}

export function ProductReviewSection({ summary, source, error }: ProductReviewSectionProps) {
  const reviewCount = summary.reviewCount || summary.reviews.length
  const average = summary.averageRating ?? 0

  return (
    <section className="buyer-product-reviews" id="reviews">
      <div className="buyer-product-section-title">
        <span>Recommendations from Nespresso</span>
        <h2>Customer reviews</h2>
      </div>
      {error && <p className="buyer-product-fallback-note">Review fallback: {error}</p>}
      <div className="buyer-product-review-summary">
        <strong>{average ? average.toFixed(1) : "New"}</strong>
        <span>*****</span>
        <p>{reviewCount} reviews {source === "mock" ? "(mock fallback)" : ""}</p>
      </div>
      <div className="buyer-product-review-list">
        {summary.reviews.length ? summary.reviews.slice(0, 3).map((review) => (
          <article key={review.id}>
            <div>
              <strong>{review.customerName}</strong>
              <span>{review.createdAt ?? "Recent"}</span>
            </div>
            <small>{"*".repeat(Math.max(1, Math.min(5, review.rating)))}</small>
            {review.title && <h3>{review.title}</h3>}
            <p>{review.content}</p>
          </article>
        )) : (
          <p className="buyer-product-empty">No reviews yet.</p>
        )}
      </div>
    </section>
  )
}
