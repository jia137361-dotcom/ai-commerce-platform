import { useState } from "react"
import { submitProductReview, type BuyerReviewsSummary, type DataSource } from "../../lib/buyer-api"
import { Card } from "../ui/Card"
import { EmptyState } from "../ui/States"
import { StatusBadge } from "../ui/StatusBadge"

type ProductReviewSectionProps = { summary?: BuyerReviewsSummary | null; source: DataSource; error?: string; review?: { productId: string; orderNumber: string; email: string; customerName?: string }; onSubmitted?: () => void }

export function ProductReviewSection({ summary, source, error, review, onSubmitted }: ProductReviewSectionProps) {
  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formMessage, setFormMessage] = useState<string>()
  const form = review ? <form className="buyer-product-review-form" onSubmit={(event) => {
    event.preventDefault()
    setSubmitting(true)
    setFormMessage(undefined)
    void submitProductReview({ ...review, rating, title, content }).then(() => {
      setFormMessage("Review published.")
      onSubmitted?.()
    }).catch((submitError) => setFormMessage(submitError instanceof Error ? submitError.message : "Unable to publish review")).finally(() => setSubmitting(false))
  }}>
    <h3>Review this delivered item</h3>
    <label>Rating<select value={rating} onChange={(event) => setRating(Number(event.target.value))}>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} / 5</option>)}</select></label>
    <label>Title<input value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} /></label>
    <label>Review<textarea value={content} maxLength={2000} onChange={(event) => setContent(event.target.value)} /></label>
    <button type="submit" disabled={submitting}>{submitting ? "Publishing…" : "Publish review"}</button>
    {formMessage ? <p role="status">{formMessage}</p> : null}
  </form> : null
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
        {summary.reviews.slice(0, 3).map((review) => <div key={review.id}><Card as="article">
          <div><strong>{review.customerName}</strong><StatusBadge tone="warning">{review.rating}/5</StatusBadge></div>
          {review.title ? <h3>{review.title}</h3> : null}<p>{review.content}</p><small>{review.createdAt ?? "Date unavailable"}</small>
        </Card></div>)}
      </div>
    </section>
  )
}
