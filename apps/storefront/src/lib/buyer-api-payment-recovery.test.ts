import { readPayPalOrderId } from "./paypal-payment-session"

describe("PayPal payment recovery session normalization", () => {
  it("accepts a real PayPal order id without a made-up prefix", () => {
    expect(readPayPalOrderId("pp_paypal_paypal", { id: "6F123456789012345" }))
      .toBe("6F123456789012345")
  })

  it("does not interpret a non-PayPal provider data id as a PayPal order", () => {
    expect(readPayPalOrderId("pp_stripe_stripe", { id: "pi_123" })).toBeUndefined()
  })
})
