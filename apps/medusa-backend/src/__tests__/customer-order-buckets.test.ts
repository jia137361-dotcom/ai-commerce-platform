import { matchesBuyerOrderBucket } from "../lib/customer-order-buckets"

describe("buyer order buckets", () => {
  it("maps payment and delivery evidence without calling processing shipped", () => {
    expect(matchesBuyerOrderBucket({ bucket: "unpaid", paymentStatus: "pending" })).toBe(true)
    expect(matchesBuyerOrderBucket({ bucket: "processing", paymentStatus: "paid", fulfillmentStatus: "pushed" })).toBe(true)
    expect(matchesBuyerOrderBucket({ bucket: "shipped", paymentStatus: "paid", fulfillmentStatus: "waiting" })).toBe(false)
    expect(matchesBuyerOrderBucket({ bucket: "shipped", fulfillmentStatus: "shipped" })).toBe(true)
    expect(matchesBuyerOrderBucket({ bucket: "delivered", fulfillmentStatus: "delivered" })).toBe(true)
  })

  it("uses real review and return evidence", () => {
    expect(matchesBuyerOrderBucket({ bucket: "reviews", orderId: "o1", fulfillmentStatus: "delivered", reviewedOrderIds: new Set() })).toBe(true)
    expect(matchesBuyerOrderBucket({ bucket: "reviews", orderId: "o1", fulfillmentStatus: "delivered", reviewedOrderIds: new Set(["o1"]) })).toBe(false)
    expect(matchesBuyerOrderBucket({ bucket: "returns", orderId: "o1", returnOrderIds: new Set(["o1"]) })).toBe(true)
  })
})
