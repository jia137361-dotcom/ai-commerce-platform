import type { BuyerPaymentProvider, BuyerPaymentSession } from "../../lib/buyer-api"
import type { Stripe, StripeElements } from "@stripe/stripe-js"
import { resolveStripePaymentMethodLabel } from "../../lib/stripe-payment-method"

export const isStripeProviderId = (providerId?: string) => Boolean(providerId?.startsWith("pp_stripe_"))

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
  "Payment succeeded, but order creation failed because shipping validation failed. Please contact support or retry with a new cart."

export async function confirmStripePaymentAndComplete<T>(input: {
  stripe: Pick<Stripe, "confirmPayment">
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
  const paymentMethodLabel = paymentIntent
    ? await resolveStripePaymentMethodLabel(paymentIntent)
    : undefined
  try {
    const orderResult = await input.complete(paymentMethodLabel)
    return { result: orderResult, paymentMethodLabel }
  } catch {
    throw new Error(STRIPE_ORDER_CREATION_FAILED_MESSAGE)
  }
}
