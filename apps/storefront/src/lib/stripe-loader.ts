import { loadStripe, type Stripe } from "@stripe/stripe-js"

const stripePromises = new Map<string, Promise<Stripe | null>>()

/**
 * Keep one Stripe.js loader per publishable key. A failed CDN request is not
 * cached permanently, so retrying the form never creates another payment.
 */
export const getStripePromise = (publishableKey: string) => {
  const key = publishableKey.trim()
  const existing = stripePromises.get(key)
  if (existing) return existing

  const promise = loadStripe(key)
  stripePromises.set(key, promise)
  void promise.then(
    (stripe) => {
      // Stripe.js reports a blocked or failed script download as null rather
      // than rejecting. Do not pin that transient failure across a retry.
      if (!stripe && stripePromises.get(key) === promise) stripePromises.delete(key)
    },
    () => {
      if (stripePromises.get(key) === promise) stripePromises.delete(key)
    }
  )
  return promise
}
