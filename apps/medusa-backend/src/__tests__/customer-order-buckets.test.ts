import {
  buyerOrderDisplayStatusLabel,
  matchesBuyerOrderBucket,
  resolveBuyerOrderDisplayStatus,
} from "../lib/customer-order-buckets"

describe("buyer order buckets", () => {
  it("maps payment and fulfillment stages to buyer tabs", () => {
    expect(matchesBuyerOrderBucket({ bucket: "unpaid", paymentStatus: "pending" })).toBe(true)
    expect(matchesBuyerOrderBucket({ bucket: "packing", paymentStatus: "paid", fulfillmentStatus: "pushed" })).toBe(true)
    expect(matchesBuyerOrderBucket({ bucket: "packing", paymentStatus: "paid", fulfillmentStatus: "shipped" })).toBe(false)
    expect(
      matchesBuyerOrderBucket({
        bucket: "awaiting_receipt",
        paymentStatus: "paid",
        fulfillmentStatus: "shipped",
        receiptConfirmed: false,
      })
    ).toBe(true)
    expect(
      matchesBuyerOrderBucket({
        bucket: "awaiting_receipt",
        paymentStatus: "paid",
        fulfillmentStatus: "delivered",
        receiptConfirmed: true,
      })
    ).toBe(false)
  })

  it("uses real review and return evidence", () => {
    expect(
      matchesBuyerOrderBucket({
        bucket: "reviews",
        orderId: "o1",
        fulfillmentStatus: "shipped",
        receiptConfirmed: true,
        reviewEligible: true,
        reviewedOrderIds: new Set(),
      })
    ).toBe(true)
    expect(
      matchesBuyerOrderBucket({
        bucket: "reviews",
        orderId: "o1",
        fulfillmentStatus: "delivered",
        receiptConfirmed: true,
        reviewedOrderIds: new Set(["o1"]),
      })
    ).toBe(true)
    expect(matchesBuyerOrderBucket({ bucket: "returns", orderId: "o1", returnOrderIds: new Set(["o1"]) })).toBe(true)
  })

  it("keeps refunded orders in after-sales with their terminal status", () => {
    expect(
      resolveBuyerOrderDisplayStatus({
        paymentStatus: "paid",
        fulfillmentStatus: "delivered",
        receiptConfirmed: true,
        refundStatus: "refunded",
      })
    ).toBe("refunded")
    expect(buyerOrderDisplayStatusLabel("refunded")).toBe("Refunded")
    expect(
      matchesBuyerOrderBucket({
        bucket: "returns",
        orderId: "o1",
        returnStatusesByOrderId: new Map([["o1", "refunded"]]),
      })
    ).toBe(true)
  })

  it("treats an in-progress refund differently from a completed refund", () => {
    expect(
      resolveBuyerOrderDisplayStatus({
        paymentStatus: "paid",
        refundStatus: "refund_processing",
      })
    ).toBe("refunding")
  })
})
