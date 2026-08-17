import {
  PaymentAmountMismatchError,
  assertInternalPaymentAmounts,
  assertPayPalOrderAmount,
  assertStripePaymentIntentAmount,
} from "../lib/payment-amount-contract"

describe("payment amount contract", () => {
  it("accepts one canonical Medusa major-unit amount", () => {
    expect(() => assertInternalPaymentAmounts({
      cartTotal: 180.44,
      collectionAmount: 180.44,
      sessionAmount: 180.44,
      currencyCode: "hkd",
    })).not.toThrow()
  })

  it("rejects an internal amount mismatch", () => {
    expect(() => assertInternalPaymentAmounts({
      cartTotal: 180.44,
      collectionAmount: 238.92,
      sessionAmount: 238.92,
      currencyCode: "hkd",
    })).toThrow(PaymentAmountMismatchError)
  })

  it("expects Stripe minor units and PayPal major decimal values", () => {
    expect(() => assertStripePaymentIntentAmount({
      expectedMajor: 180.44,
      currencyCode: "hkd",
      intentAmountMinor: 18044,
      intentCurrency: "hkd",
    })).not.toThrow()
    expect(() => assertPayPalOrderAmount({
      expectedMajor: 180.44,
      currencyCode: "hkd",
      orderAmountValue: "180.44",
      orderCurrency: "HKD",
    })).not.toThrow()
  })

  it("rejects the historic Stripe 100x overcharge", () => {
    expect(() => assertStripePaymentIntentAmount({
      expectedMajor: 180.44,
      currencyCode: "hkd",
      intentAmountMinor: 1804400,
      intentCurrency: "hkd",
    })).toThrow("PAYMENT_AMOUNT_MISMATCH")
  })
})
