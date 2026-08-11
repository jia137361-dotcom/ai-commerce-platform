import {
  extractPaymentIntentIdFromClientSecret,
  formatStripePaymentMethodLabel,
} from "../lib/stripe-payment-method-label"

describe("stripe-payment-method-label", () => {
  it("extracts payment intent id from client secret", () => {
    expect(extractPaymentIntentIdFromClientSecret("pi_abc123_secret_xyz")).toBe("pi_abc123")
  })

  it("formats card brands with last4", () => {
    expect(formatStripePaymentMethodLabel({
      type: "card",
      card: { brand: "visa", last4: "4242" },
    })).toBe("VISA ···· 4242")
  })

  it("formats wallet payments", () => {
    expect(formatStripePaymentMethodLabel({
      type: "card",
      card: { brand: "visa", last4: "4242", wallet: { type: "apple_pay" } },
    })).toBe("Apple Pay")
  })
})
