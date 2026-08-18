import {
  chooseDefaultPaymentProvider,
  buildStripeCheckoutReturnUrl,
  canReconcileStripeReturn,
  clearStripeCheckoutReturnContext,
  persistStripeCheckoutReturnContext,
  readStripeCheckoutReturnContext,
  completeSavedStripePaymentAuthentication,
  confirmStripePaymentAndComplete,
  confirmStripeWalletPaymentAndComplete,
  hasValidStripeClientSecret,
  shouldRecoverConfirmedPaymentAfterCompletionFailure,
  STRIPE_ORDER_CREATION_FAILED_MESSAGE,
} from "./checkout-payment"

describe("Stripe checkout payment state", () => {
  const providers = [
    { id: "pp_system_default", isStripe: false },
    { id: "pp_stripe_stripe", isStripe: true },
  ]

  it("selects Stripe only when the region exposes it and a test publishable key exists", () => {
    expect(chooseDefaultPaymentProvider(providers, "pk_test_123")).toBe("pp_stripe_stripe")
    expect(chooseDefaultPaymentProvider(providers, "pk_live_123")).toBe("pp_stripe_stripe")
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

  it("keeps the original cart and checkout context through a Stripe 3DS redirect", () => {
    const returnUrl = buildStripeCheckoutReturnUrl({
      origin: "http://127.0.0.1:5174",
      cartId: "cart_123",
      storeId: "store_123",
      platformCheckoutId: "platform_123",
      platformCheckoutIndex: 1,
      platformCheckoutCount: 2,
    })

    expect(returnUrl).toBe(
      "http://127.0.0.1:5174/checkout?cart_id=cart_123&store=store_123&platform_checkout_id=platform_123&platform_checkout_index=1&platform_checkout_count=2"
    )
  })

  it("persists the original cart when Stripe drops return-url query parameters", () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    }
    const returnUrl = buildStripeCheckoutReturnUrl({
      origin: "http://127.0.0.1:5174",
      cartId: "cart_123",
      storeId: "store_123",
    })

    persistStripeCheckoutReturnContext(returnUrl, storage)
    expect(readStripeCheckoutReturnContext(storage)).toEqual({ cartId: "cart_123", storeId: "store_123" })
    clearStripeCheckoutReturnContext(storage)
    expect(readStripeCheckoutReturnContext(storage)).toBeNull()
  })

  it("waits for shipping to be restored before reconciling a returned 3DS payment", () => {
    expect(canReconcileStripeReturn({ hasReturnParams: true, cartId: "cart_1", providerId: "pp_stripe_stripe", requiresShippingMethod: true, shippingMethodSaved: false })).toBe(false)
    expect(canReconcileStripeReturn({ hasReturnParams: true, cartId: "cart_1", providerId: "pp_stripe_stripe", requiresShippingMethod: true, shippingMethodSaved: true })).toBe(true)
    expect(canReconcileStripeReturn({ hasReturnParams: true, cartId: "cart_1", providerId: "pp_stripe_stripe", requiresShippingMethod: false, shippingMethodSaved: false })).toBe(true)
  })

  it("refreshes payment recovery after a confirmed Stripe or PayPal payment cannot create an order", () => {
    expect(shouldRecoverConfirmedPaymentAfterCompletionFailure(true, "pp_stripe_stripe")).toBe(true)
    expect(shouldRecoverConfirmedPaymentAfterCompletionFailure(true, "pp_paypal_paypal")).toBe(true)
    expect(shouldRecoverConfirmedPaymentAfterCompletionFailure(false, "pp_paypal_paypal")).toBe(false)
    expect(shouldRecoverConfirmedPaymentAfterCompletionFailure(true, "pp_system_default")).toBe(false)
  })

  it("does not reconfirm a saved-card PaymentIntent that the backend already succeeded", async () => {
    const handleNextAction = jest.fn()
    const finalizeConfirmation = jest.fn()

    await expect(completeSavedStripePaymentAuthentication({
      initialStatus: "succeeded",
      clientSecret: "pi_saved_secret_123",
      handleNextAction,
      finalizeConfirmation,
    })).resolves.toBe("succeeded")

    expect(handleNextAction).not.toHaveBeenCalled()
    expect(finalizeConfirmation).not.toHaveBeenCalled()
  })

  it("handles saved-card 3DS and performs the final manual server confirmation", async () => {
    const handleNextAction = jest.fn().mockResolvedValue({
      paymentIntent: { status: "requires_confirmation" },
    })
    const finalizeConfirmation = jest.fn().mockResolvedValue("succeeded")

    await expect(completeSavedStripePaymentAuthentication({
      initialStatus: "requires_action",
      clientSecret: "pi_saved_secret_123",
      handleNextAction,
      finalizeConfirmation,
    })).resolves.toBe("succeeded")

    expect(handleNextAction).toHaveBeenCalledWith("pi_saved_secret_123")
    expect(finalizeConfirmation).toHaveBeenCalledTimes(1)
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
      stripe: {
        confirmPayment: jest.fn().mockResolvedValue({ paymentIntent: { status: "succeeded", payment_method_types: ["card"] } }),
        retrievePaymentMethod: jest.fn(),
      } as never,
      elements: {} as never,
      returnUrl: "http://localhost/checkout",
      complete,
    })).resolves.toEqual({ result: { orderId: "order_1" }, paymentMethodLabel: "Card" })
    expect(complete).toHaveBeenCalledWith("Card")
  })

  it("resolves card labels from Stripe payment methods", async () => {
    const complete = jest.fn().mockResolvedValue({ orderId: "order_1" })
    await expect(confirmStripePaymentAndComplete({
      stripe: {
        confirmPayment: jest.fn().mockResolvedValue({
          paymentIntent: { status: "succeeded", payment_method: "pm_123" },
        }),
        retrievePaymentMethod: jest.fn().mockResolvedValue({
          paymentMethod: { type: "card", card: { brand: "visa", last4: "4242" } },
        }),
      } as never,
      elements: {} as never,
      returnUrl: "http://localhost/checkout",
      complete,
    })).resolves.toEqual({ result: { orderId: "order_1" }, paymentMethodLabel: "VISA ···· 4242" })
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

  it("confirms the existing Stripe PaymentIntent before completing a wallet order once", async () => {
    const complete = jest.fn().mockResolvedValue({ orderId: "order_1" })
    const elements = { submit: jest.fn().mockResolvedValue({}) }
    await expect(confirmStripeWalletPaymentAndComplete({
      stripe: { confirmPayment: jest.fn().mockResolvedValue({ paymentIntent: { status: "succeeded", payment_method_types: ["card"] } }) } as never,
      elements: elements as never,
      returnUrl: "http://localhost/checkout",
      complete,
    })).resolves.toEqual({ result: { orderId: "order_1" }, paymentMethodLabel: "Card" })
    expect(elements.submit).toHaveBeenCalledTimes(1)
    expect(complete).toHaveBeenCalledTimes(1)
  })

  it("does not complete a wallet order when Elements rejects it", async () => {
    const complete = jest.fn()
    await expect(confirmStripeWalletPaymentAndComplete({
      stripe: { confirmPayment: jest.fn() } as never,
      elements: { submit: jest.fn().mockResolvedValue({ error: { message: "Wallet unavailable" } }) } as never,
      returnUrl: "http://localhost/checkout",
      complete,
    })).rejects.toThrow("Wallet unavailable")
    expect(complete).not.toHaveBeenCalled()
  })
})
