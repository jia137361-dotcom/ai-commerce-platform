import { formatStripePaymentMethodLabel } from "./stripe-payment-method"

describe("stripe-payment-method", () => {
  it("formats card brands with last4", () => {
    expect(formatStripePaymentMethodLabel({
      type: "card",
      card: { brand: "mastercard", last4: "8210" },
    })).toBe("MASTERCARD ···· 8210")
  })

  it("formats wallet payments", () => {
    expect(formatStripePaymentMethodLabel({
      type: "card",
      card: { wallet: { type: "google_pay" } },
    })).toBe("Google Pay")
  })
})
