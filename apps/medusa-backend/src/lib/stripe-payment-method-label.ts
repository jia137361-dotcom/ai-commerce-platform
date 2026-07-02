import { isStripeConfigured, stripeApiRequest } from "./stripe-client"

type StripeCard = {
  brand?: string
  last4?: string
  wallet?: { type?: string | null } | null
}

type StripePaymentMethod = {
  id?: string
  type?: string
  card?: StripeCard | null
}

const WALLET_LABELS: Record<string, string> = {
  apple_pay: "Apple Pay",
  google_pay: "Google Pay",
  link: "Link",
}

const TYPE_LABELS: Record<string, string> = {
  card: "Card",
  apple_pay: "Apple Pay",
  google_pay: "Google Pay",
  link: "Link",
  paypal: "PayPal",
}

export const extractPaymentIntentIdFromClientSecret = (clientSecret: string) => {
  const match = /^((?:pi|seti)_[A-Za-z0-9]+)_secret_/.exec(clientSecret.trim())
  return match?.[1] ?? null
}

export const formatStripePaymentMethodLabel = (method: StripePaymentMethod) => {
  const wallet = method.card?.wallet?.type
  if (wallet && WALLET_LABELS[wallet]) return WALLET_LABELS[wallet]
  if (method.type && WALLET_LABELS[method.type]) return WALLET_LABELS[method.type]
  if (method.type === "card" && method.card?.brand && method.card.last4) {
    return `${method.card.brand.toUpperCase()} ···· ${method.card.last4}`
  }
  if (method.type && TYPE_LABELS[method.type]) return TYPE_LABELS[method.type]
  return method.type ?? "Payment method"
}

const formatPaymentMethodTypeFallback = (type?: string) =>
  type ? TYPE_LABELS[type] ?? type.replace(/_/g, " ") : null

export async function resolvePaymentMethodLabelFromClientSecret(
  clientSecret: string
): Promise<string | null> {
  if (!isStripeConfigured()) return null
  const paymentIntentId = extractPaymentIntentIdFromClientSecret(clientSecret)
  if (!paymentIntentId?.startsWith("pi_")) return null

  const paymentIntent = await stripeApiRequest<{
    payment_method?: string | StripePaymentMethod | null
    payment_method_types?: string[]
  }>(`/payment_intents/${paymentIntentId}`)

  const paymentMethodRef = paymentIntent.payment_method
  if (typeof paymentMethodRef === "object" && paymentMethodRef) {
    return formatStripePaymentMethodLabel(paymentMethodRef)
  }
  if (typeof paymentMethodRef === "string" && paymentMethodRef) {
    const paymentMethod = await stripeApiRequest<StripePaymentMethod>(`/payment_methods/${paymentMethodRef}`)
    return formatStripePaymentMethodLabel(paymentMethod)
  }

  return formatPaymentMethodTypeFallback(paymentIntent.payment_method_types?.[0])
}
