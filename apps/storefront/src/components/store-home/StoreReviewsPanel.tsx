import type { BuyerReviewsSummary } from "../../lib/buyer-api"
import { Card } from "../ui/Card"

export function StoreReviewsPanel({ summary, error }: { summary: BuyerReviewsSummary | null; error?: string }) {
  if (error) return <section className="buyer-shop-store-reviews"><h2>Reviews unavailable</h2><p>The review service could not be reached. No fallback reviews are shown.</p></section>
  if (!summary?.reviewCount) return <section className="buyer-shop-store-reviews"><h2>No reviews yet</h2><p>Verified delivered-order reviews will appear here.</p></section>
  return <section className="buyer-shop-store-reviews"><header><div><p>Verified buyer feedback</p><h2>Store reviews</h2></div><strong>{summary.averageRating?.toFixed(1)} ★ · {summary.reviewCount} reviews</strong></header><div>{summary.reviews.map((review) => <Card as="article" key={review.id}><div><strong>{review.customerName}</strong><span>{review.rating}/5</span></div>{review.productTitle ? <small>{review.productTitle}</small> : null}{review.title ? <h3>{review.title}</h3> : null}<p>{review.content}</p></Card>)}</div></section>
}
