import {
  getStripeWalletRuntimeDiagnostic,
  hasSupportedStripeWallet,
  normalizeStripeWalletAvailability,
  resolveStripeWalletContainerClass,
  resolveStripeWalletPresentationOptions,
} from "../../lib/stripe-wallet"

describe("Stripe wallet availability", () => {
  it("hides the wallet area when Stripe reports no Apple Pay or Google Pay", () => {
    expect(hasSupportedStripeWallet()).toBe(false)
    expect(hasSupportedStripeWallet({ applePay: false, googlePay: false })).toBe(false)
  })

  it("shows the wallet area only for Stripe-reported Apple Pay or Google Pay", () => {
    expect(hasSupportedStripeWallet({ applePay: true })).toBe(true)
    expect(hasSupportedStripeWallet({ googlePay: true })).toBe(true)
  })

  it("normalizes ready and availability-change event shapes", () => {
    expect(normalizeStripeWalletAvailability({ applePay: true, googlePay: false })).toEqual({ applePay: true, googlePay: false })
    expect(normalizeStripeWalletAvailability({ applePay: { available: false }, googlePay: { available: true } })).toEqual({ applePay: false, googlePay: true })
  })

  it("does not reserve space once Stripe reports no supported wallet", () => {
    expect(resolveStripeWalletContainerClass(true, { applePay: false, googlePay: false })).toContain("hidden")
    // The initial pending state mounts ExpressCheckoutElement independently of PaymentElement.onReady.
    expect(resolveStripeWalletContainerClass(false, { applePay: false, googlePay: false })).not.toContain("hidden")
    expect(resolveStripeWalletContainerClass(true, { applePay: true, googlePay: false })).not.toContain("hidden")
  })

  it("uses explicit always modes for development and auto modes for production", () => {
    expect(resolveStripeWalletPresentationOptions(true)).toEqual(expect.objectContaining({
      layout: { maxColumns: 2, maxRows: 1, overflow: "never" },
      paymentMethodOrder: ["apple_pay", "google_pay"],
      paymentMethods: { applePay: "always", googlePay: "always" },
    }))
    expect(resolveStripeWalletPresentationOptions(false).paymentMethods).toEqual({ applePay: "auto", googlePay: "auto" })
  })

  it("reports only non-sensitive browser prerequisites in diagnostics", () => {
    expect(getStripeWalletRuntimeDiagnostic({
      origin: "http://127.0.0.1:5174",
      protocol: "http:",
      userAgent: "Mozilla/5.0 Chrome/126.0.0.0 Safari/537.36",
    })).toEqual({
      origin: "http://127.0.0.1:5174",
      protocol: "http:",
      isHttps: false,
      browserFamily: "Chrome",
    })
  })
})
