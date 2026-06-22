import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { StoreReviewsPanel } from "./StoreReviewsPanel"

describe("StoreReviewsPanel", () => {
  it("shows no fake rating when the store has no reviews", () => {
    const html = renderToStaticMarkup(createElement(StoreReviewsPanel, { summary: { productId: "store", averageRating: null, reviewCount: 0, ratingBreakdown: {}, reviews: [] } }))
    expect(html).toContain("No reviews yet")
    expect(html).not.toContain("4.8")
  })

  it("renders only reviews supplied by the backend", () => {
    const html = renderToStaticMarkup(createElement(StoreReviewsPanel, { summary: { productId: "store", averageRating: 5, reviewCount: 1, ratingBreakdown: { "5": 1 }, reviews: [{ id: "r1", customerName: "Verified buyer", rating: 5, content: "Real review", productTitle: "Real product" }] } }))
    expect(html).toContain("Real review")
    expect(html).toContain("Real product")
    expect(html).toContain("5.0")
  })
})
