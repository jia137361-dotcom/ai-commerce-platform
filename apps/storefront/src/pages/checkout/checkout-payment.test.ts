import {
  chooseDefaultPaymentProvider,
  confirmStripePaymentAndComplete,
  hasValidStripeClientSecret,
  STRIPE_ORDER_CREATION_FAILED_MESSAGE,
} from "./checkout-payment"

describe("Stripe checkout payment state", () => {
  const providers = [
    { id: "pp_system_default", isStripe: false },
    { id: "pp_stripe_stripe", isStripe: true },
  ]

  it("selects Stripe only when the region exposes it and a test publishable key exists", () => {
    expect(chooseDefaultPaymentProvider(providers, "pk_test_123")).toBe("pp_stripe_stripe")
    expect(chooseDefaultPaymentProvider(providers, "")).toBe("pp_system_default")
    expect(chooseDefaultPaymentProvider([providers[0]], "pk_test_123")).toBe("pp_system_default")
  })

  it("prefers the card Stripe provider over another Stripe payment method", () => {
    expect(
      chooseDefaultPaymentProvider(
        [
          { id: "pp_stripe-blik_stripe", isStripe: true },
          { id: "pp_stripe_stripe", isStripe: true },
        ],
        "pk_test_123"
      )
    ).toBe("pp_stripe_stripe")
  })

  it("requires a real PaymentIntent client secret", () => {
    expect(hasValidStripeClientSecret({ id: "ps_1", providerId: "pp_stripe_stripe", clientSecret: "pi_1_secret_abc" })).toBe(true)
    expect(hasValidStripeClientSecret({ id: "ps_1", providerId: "pp_stripe_stripe" })).toBe(false)
  })

  it("does not complete the cart when Stripe fails", async () => {
    const complete = jest.fn()
    await expect(confirmStripePaymentAndComplete({
      stripe: { confirmPayment: jest.fn().mockResolvedValue({ error: { message: "Card declined" } }) } as never,
      elements: {} as never,
      returnUrl: "http://localhost/checkout",
      complete,
    })).rejects.toThrow("Card declined")
    expect(complete).not.toHaveBeenCalled()
  })

  it("completes the cart only after Stripe success", async () => {
    const complete = jest.fn().mockResolvedValue({ orderId: "order_1" })
    await expect(confirmStripePaymentAndComplete({
      stripe: { confirmPayment: jest.fn().mockResolvedValue({ paymentIntent: { status: "succeeded" } }) } as never,
      elements: {} as never,
      returnUrl: "http://localhost/checkout",
      complete,
    })).resolves.toEqual({ orderId: "order_1" })
    expect(complete).toHaveBeenCalledTimes(1)
  })

  it("shows a safe error when Stripe succeeds but Medusa order creation fails", async () => {
    const complete = jest.fn().mockRejectedValue(
      new Error("The cart items require shipping profiles that are not satisfied by the current shipping methods")
    )
    await expect(confirmStripePaymentAndComplete({
      stripe: { confirmPayment: jest.fn().mockResolvedValue({ paymentIntent: { status: "succeeded" } }) } as never,
      elements: {} as never,
      returnUrl: "http://localhost/checkout",
      complete,
    })).rejects.toThrow(STRIPE_ORDER_CREATION_FAILED_MESSAGE)
    expect(complete).toHaveBeenCalledTimes(1)
  })
})
