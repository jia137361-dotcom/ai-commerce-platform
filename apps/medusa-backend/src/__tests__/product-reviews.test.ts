import {
  isValidReviewRating,
  normalizeProductReview,
  readMcProductIdsFromOrder,
  summarizeProductReviews,
} from "../lib/product-reviews"

describe("product review helpers", () => {
  it("accepts integer star ratings from 1 to 5 only", () => {
    expect(isValidReviewRating(1)).toBe(true)
    expect(isValidReviewRating(5)).toBe(true)

    expect(isValidReviewRating(0)).toBe(false)
    expect(isValidReviewRating(6)).toBe(false)
    expect(isValidReviewRating(4.5)).toBe(false)
    expect(isValidReviewRating("5")).toBe(false)
  })

  it("summarizes average rating and star breakdown", () => {
    const summary = summarizeProductReviews([
      { rating: 5 },
      { rating: 5 },
      { rating: 4 },
      { rating: 1 },
    ])

    expect(summary.average_rating).toBe(3.8)
    expect(summary.review_count).toBe(4)
    expect(summary.rating_breakdown).toEqual({
      "5": 2,
      "4": 1,
      "3": 0,
      "2": 0,
      "1": 1,
    })
  })

  it("returns empty summary when there are no reviews", () => {
    expect(summarizeProductReviews([])).toEqual({
      average_rating: null,
      review_count: 0,
      rating_breakdown: {
        "5": 0,
        "4": 0,
        "3": 0,
        "2": 0,
        "1": 0,
      },
    })
  })

  it("reads purchased store-core product ids from order line metadata", () => {
    const ids = readMcProductIdsFromOrder({
      items: [
        { metadata: { mc_product_id: "prod_1" } },
        { metadata: { mc_product_id: "prod_2" } },
        { metadata: { mc_product_id: "prod_1" } },
        { metadata: {} },
      ],
    })

    expect(ids.sort()).toEqual(["prod_1", "prod_2"])
  })

  it("normalizes extended review metadata fields", () => {
    expect(
      normalizeProductReview({
        id: "prv_1",
        rating: 5,
        metadata: {
          logistics_rating: 4,
          overall_rating: 5,
          image_urls: ["https://example.com/review.jpg"],
        },
      })
    ).toMatchObject({
      logistics_rating: 4,
      overall_rating: 5,
      image_urls: ["https://example.com/review.jpg"],
    })
  })
})
