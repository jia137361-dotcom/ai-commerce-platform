import { reviews } from "../../lib/mock-data"
import { DisplayMoneyText } from "../ui/DisplayMoneyText"

const bars = [
  ["5 stars", 72],
  ["4 stars", 18],
  ["3 stars", 7],
  ["2 stars", 2],
  ["1 star", 1],
] as const

export function ReviewsPanel() {
  return (
    <section className="reviews-panel">
      <aside className="rating-summary">
        <span>4.6</span>
        <strong>overall</strong>
        <p>Based on recent verified purchases</p>
        {bars.map(([label, value]) => (
          <div className="rating-bar" key={label}>
            <small>{label}</small>
            <div><i style={{ width: `${value}%` }} /></div>
            <small>{value}%</small>
          </div>
        ))}
      </aside>
      <div className="review-list">
        {reviews.map((review) => (
          <article className="review-card" key={review.id}>
            <div className="review-meta">
              <strong>{review.user}</strong>
              <span>{review.location} | {review.date}</span>
              <span className="stars">{"★".repeat(review.rating)}</span>
            </div>
            <p>{review.text}</p>
            <div className="review-product">
              <img src={review.product.imageUrl} alt={review.product.title} />
              <div>
                <strong>{review.product.title}</strong>
                <DisplayMoneyText amount={review.product.numericPrice} unavailableLabel="Price unavailable" />
              </div>
              <button type="button">Find Similar</button>
            </div>
            <div className="review-actions">
              <button type="button">Share</button>
              <button type="button">Like {review.likes}</button>
              <button type="button">Report</button>
              <button type="button">More</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
