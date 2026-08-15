import { describe, expect, it } from "vitest"
import { canReviewRefund, parsePartialRefundAmount } from "./refund-review-state"

describe("seller refund review state", () => {
  it("accepts a partial amount only within the eligible balance", () => {
    expect(parsePartialRefundAmount("5.50", 2000)).toBe(550)
    expect(parsePartialRefundAmount("21", 2000)).toBeNull()
    expect(parsePartialRefundAmount("0", 20)).toBeNull()
  })

  it("does not allow another decision while provider processing is pending", () => {
    expect(canReviewRefund("manual_review")).toBe(true)
    expect(canReviewRefund("refund_pending")).toBe(false)
    expect(canReviewRefund("refunded")).toBe(false)
  })
})
