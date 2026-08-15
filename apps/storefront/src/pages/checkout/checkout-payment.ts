import type { BuyerPaymentProvider, BuyerPaymentSession } from "../../lib/buyer-api"
import type { Stripe, StripeElements } from "@stripe/stripe-js"
import { formatStripePaymentMethodLabel, resolveStripePaymentMethodLabel } from "../../lib/stripe-payment-method"

export const isStripeProviderId = (providerId?: string) => Boolean(providerId?.startsWith("pp_stripe_"))
export const isPayPalProviderId = (providerId?: string) => Boolean(providerId?.startsWith("pp_paypal_"))

export const isValidStripePublishableKey = (publishableKey: string) =>
  (publishableKey.startsWith("pk_test_") || publishableKey.startsWith("pk_live_")) &&
  !/^pk_(test|live)_x+$/i.test(publishableKey) &&
  publishableKey !== "pk_test_xxx" &&
  publishableKey !== "pk_replace_me"

export const describeStripePublishableKeyIssue = (publishableKey: string) => {
  const key = publishableKey.trim()
  if (!key) {
    return "Add VITE_STRIPE_PK=pk_test_... to apps/storefront/.env.local and restart the storefront."
  }
  if (key.startsWith("sk_test_") || key.startsWith("sk_live_")) {
    return "VITE_STRIPE_PK must be the Stripe publishable key (pk_test_...), not the secret key (sk_test_...). Copy the Publishable key from Stripe Dashboard → Developers → API keys."
  }
  if (!isValidStripePublishableKey(key)) {
    return "Add a valid Stripe publishable key to VITE_STRIPE_PK (pk_test_... or pk_live_...), then restart the storefront."
  }
  return null
}

export const chooseDefaultPaymentProvider = (
  providers: BuyerPaymentProvider[],
  stripePublishableKey: string
) => {
  const stripe =
    providers.find((provider) => provider.id === "pp_stripe_stripe") ??
    providers.find((provider) => provider.isStripe)
  if (stripe && isValidStripePublishableKey(stripePublishableKey)) return stripe.id
  return providers.find((provider) => provider.id === "pp_system_default")?.id ?? providers[0]?.id ?? "pp_system_default"
}

export const hasValidStripeClientSecret = (session?: BuyerPaymentSession | null) =>
  Boolean(session?.clientSecret?.startsWith("pi_") && session.clientSecret.includes("_secret_"))

const COMPLETABLE_STRIPE_STATUSES = new Set(["succeeded", "processing", "requires_capture"])

export const STRIPE_ORDER_CREATION_FAILED_MESSAGE =
  "支付已确认，订单正在恢复。请不要再次付款；如订单稍后仍未显示，请联系支持。"

/**
 * Stripe has accepted the payment, but the separate cart-completion request
 * failed. Treat this differently from a declined card: confirming the same
 * PaymentIntent again is invalid and can surface as a Stripe processing error.
 */
export class StripePaymentConfirmedOrderRecoveryError extends Error {
  readonly completionError: unknown

  constructor(completionError: unknown) {
    super(STRIPE_ORDER_CREATION_FAILED_MESSAGE)
    this.name = "StripePaymentConfirmedOrderRecoveryError"
    this.completionError = completionError
  }
}

type StripeWithPaymentMethodLookup = Pick<Stripe, "confirmPayment"> & {
  retrievePaymentMethod?: (paymentMethod: string) => Promise<{
    paymentMethod?: {
      type?: string
      card?: {
        brand?: string
        last4?: string
        wallet?: { type?: string | null } | null
      } | null
    }
  }>
}

export async function confirmStripePaymentAndComplete<T>(input: {
  stripe: StripeWithPaymentMethodLookup
  elements: StripeElements
  returnUrl: string
  complete: (paymentMethodLabel?: string) => Promise<T>
}): Promise<{ result: T; paymentMethodLabel?: string }> {
  const result = await input.stripe.confirmPayment({
    elements: input.elements,
    redirect: "if_required",
    confirmParams: { return_url: input.returnUrl },
  })
  if (result.error) throw new Error(result.error.message || "Stripe payment confirmation failed.")
  const paymentIntent = result.paymentIntent
  const status = paymentIntent?.status
  if (!status || !COMPLETABLE_STRIPE_STATUSES.has(status)) {
    throw new Error(`Stripe payment is not ready to complete${status ? ` (${status})` : ""}.`)
  }
  let paymentMethodLabel = paymentIntent
    ? await resolveStripePaymentMethodLabel(paymentIntent)
    : undefined
  if (!paymentMethodLabel && typeof paymentIntent?.payment_method === "string" && input.stripe.retrievePaymentMethod) {
    const lookup = await input.stripe.retrievePaymentMethod(paymentIntent.payment_method)
    if (lookup.paymentMethod) {
      paymentMethodLabel = formatStripePaymentMethodLabel(lookup.paymentMethod)
    }
  }
  try {
    const orderResult = await input.complete(paymentMethodLabel)
    return { result: orderResult, paymentMethodLabel }
  } catch (error) {
    throw new StripePaymentConfirmedOrderRecoveryError(error)
  }
}

export async function confirmStripeWalletPaymentAndComplete<T>(input: {
  stripe: StripeWithPaymentMethodLookup
  elements: StripeElements
  returnUrl: string
  complete: (paymentMethodLabel?: string) => Promise<T>
}): Promise<{ result: T; paymentMethodLabel?: string }> {
  const { error } = await input.elements.submit()
  if (error) throw new Error(error.message || "Stripe wallet confirmation failed.")
  return confirmStripePaymentAndComplete(input)
}
