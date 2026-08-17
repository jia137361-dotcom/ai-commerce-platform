import { isCheckoutPaymentAttemptExpired } from "../lib/checkout-payment-attempts"

describe("checkout payment attempt expiry", () => {
  it("never expires a completed attempt or an attempt linked to an order", () => {
    const expiredAt = new Date(Date.now() - 60_000)
    expect(isCheckoutPaymentAttemptExpired({
      id: "cpa_completed",
      status: "completed",
      completed_order_id: "order_1",
      expires_at: expiredAt,
    })).toBe(false)
    expect(isCheckoutPaymentAttemptExpired({
      id: "cpa_linked",
      status: "payment_succeeded",
      completed_order_id: "order_1",
      expires_at: expiredAt,
    })).toBe(false)
  })
})
