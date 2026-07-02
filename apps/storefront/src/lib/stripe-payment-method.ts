import type { PaymentIntent, PaymentMethod } from "@stripe/stripe-js"

type StripeCardLike = {
  brand?: string
  last4?: string
  wallet?: { type?: string | null } | null
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

export const formatStripePaymentMethodLabel = (method: {
  type?: string
  card?: StripeCardLike | null
}) => {
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
  type ? TYPE_LABELS[type] ?? type.replace(/_/g, " ") : undefined

export async function resolveStripePaymentMethodLabel(
  paymentIntent: Pick<PaymentIntent, "payment_method" | "payment_method_types">
): Promise<string | undefined> {
  const paymentMethodRef = paymentIntent.payment_method
  if (paymentMethodRef && typeof paymentMethodRef === "object") {
    return formatStripePaymentMethodLabel(paymentMethodRef as PaymentMethod)
  }
  return formatPaymentMethodTypeFallback(paymentIntent.payment_method_types?.[0])
}
