import { currencyExponent, majorToProviderMinor, moneyEquals, normalizeMajor } from "./money"

export class PaymentAmountMismatchError extends Error {
  readonly code = "PAYMENT_AMOUNT_MISMATCH"

  constructor(detail: string) {
    super(`PAYMENT_AMOUNT_MISMATCH: ${detail}`)
    this.name = "PaymentAmountMismatchError"
  }
}

const assertCurrency = (expected: string, actual: string | null | undefined, boundary: string) => {
  if (expected.toLowerCase() !== String(actual ?? "").toLowerCase()) {
    throw new PaymentAmountMismatchError(`${boundary} currency does not match ${expected.toUpperCase()}`)
  }
}

export const assertInternalPaymentAmounts = (input: {
  cartTotal: unknown
  collectionAmount: unknown
  sessionAmount: unknown
  currencyCode: string
  collectionCurrency?: string | null
  sessionCurrency?: string | null
}) => {
  if (input.collectionCurrency != null) {
    assertCurrency(input.currencyCode, input.collectionCurrency, "payment collection")
  }
  if (input.sessionCurrency != null) {
    assertCurrency(input.currencyCode, input.sessionCurrency, "payment session")
  }
  if (!moneyEquals(input.cartTotal, input.collectionAmount, input.currencyCode)) {
    throw new PaymentAmountMismatchError("payment collection amount does not match cart total")
  }
  if (!moneyEquals(input.cartTotal, input.sessionAmount, input.currencyCode)) {
    throw new PaymentAmountMismatchError("payment session amount does not match cart total")
  }
}

export const assertStripePaymentIntentAmount = (input: {
  expectedMajor: unknown
  currencyCode: string
  intentAmountMinor: unknown
  intentCurrency?: string | null
}) => {
  assertCurrency(input.currencyCode, input.intentCurrency, "Stripe PaymentIntent")
  const expectedMinor = majorToProviderMinor(input.expectedMajor, input.currencyCode)
  if (Number(input.intentAmountMinor) !== expectedMinor) {
    throw new PaymentAmountMismatchError(
      `Stripe PaymentIntent amount ${String(input.intentAmountMinor)} does not match expected ${expectedMinor}`
    )
  }
}

export const assertPayPalOrderAmount = (input: {
  expectedMajor: unknown
  currencyCode: string
  orderAmountValue?: string | null
  orderCurrency?: string | null
}) => {
  assertCurrency(input.currencyCode, input.orderCurrency, "PayPal order")
  const digits = currencyExponent(input.currencyCode)
  const expected = normalizeMajor(input.expectedMajor, input.currencyCode).toFixed(digits)
  if (input.orderAmountValue !== expected) {
    throw new PaymentAmountMismatchError(
      `PayPal order amount ${String(input.orderAmountValue)} does not match expected ${expected}`
    )
  }
}
