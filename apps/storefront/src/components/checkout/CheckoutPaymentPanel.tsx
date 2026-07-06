import { Elements } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { useMemo } from "react"
import type { BuyerPaymentProvider, BuyerPaymentSession } from "../../lib/buyer-api"
import { describeStripePublishableKeyIssue, hasValidStripeClientSecret, isStripeProviderId, isValidStripePublishableKey } from "../../pages/checkout/checkout-payment"
import { StripePaymentForm } from "./StripePaymentForm"
import { Card } from "../ui/Card"
import { StatusBadge } from "../ui/StatusBadge"

type CheckoutPaymentPanelProps = {
  providers?: BuyerPaymentProvider[]
  selectedProviderId?: string
  onProviderChange?: (providerId: string) => void
  session?: BuyerPaymentSession | null
  stripePublishableKey?: string
  preparing?: boolean
  error?: string
  blockedReason?: string
  canSubmit?: boolean
  placing?: boolean
  onStripeComplete?: (paymentMethodLabel?: string) => Promise<void>
}

export function CheckoutPaymentPanel({
  providers = [{ id: "pp_system_default", isStripe: false }],
  selectedProviderId = "pp_system_default",
  onProviderChange,
  session,
  stripePublishableKey = "",
  preparing = false,
  error,
  blockedReason,
  canSubmit = false,
  placing = false,
  onStripeComplete = async () => undefined,
}: CheckoutPaymentPanelProps) {
  const stripeSelected = isStripeProviderId(selectedProviderId)
  const validClientSecret = hasValidStripeClientSecret(session)
  const stripeReady = isValidStripePublishableKey(stripePublishableKey)
  const stripeKeyIssue = describeStripePublishableKeyIssue(stripePublishableKey)
  const stripeAvailable = providers.some((provider) => provider.isStripe)
  const stripePromise = useMemo(
    () => stripeSelected && validClientSecret && stripeReady ? loadStripe(stripePublishableKey) : null,
    [stripePublishableKey, stripeSelected, validClientSecret, stripeReady]
  )

  return (
    <Card as="section" className="buyer-checkout-card buyer-checkout-payment-card">
      <header><div><p>Step 3</p><h2>Payment method</h2></div><StatusBadge tone={stripeSelected && validClientSecret ? "success" : stripeAvailable ? "warning" : "neutral"}>{stripeSelected ? validClientSecret ? "Stripe ready" : "Setup required" : stripeAvailable ? "Stripe available" : "Dev fallback"}</StatusBadge></header>

      <div className="buyer-checkout-payment-providers" role="radiogroup" aria-label="Payment method">
        {providers.map((provider) => (
          <button
            key={provider.id}
            type="button"
            role="radio"
            aria-checked={selectedProviderId === provider.id}
            className={selectedProviderId === provider.id ? "active" : ""}
            onClick={() => onProviderChange?.(provider.id)}
          >
            <strong>{provider.isStripe ? "Add new card or wallet" : "System-default authorization"}</strong>
          </button>
        ))}
      </div>

      {blockedReason ? <p className="buyer-checkout-card-copy">{blockedReason}</p> : null}
      {error ? <p className="buyer-checkout-inline-error" role="alert">{error}</p> : null}

      {blockedReason ? null : stripeSelected ? (
        !stripeReady ? (
          <div className="buyer-checkout-payment-message">
            <strong>Stripe publishable key required</strong>
            <p>{stripeKeyIssue ?? "Add VITE_STRIPE_PK=pk_test_... to apps/storefront/.env.local, restart the storefront, then reload checkout."}</p>
            <p>You can also save cards in <a href="/account/payment-methods">Account → Payment methods</a> once Stripe is configured.</p>
          </div>
        ) : preparing ? (
          <p className="buyer-checkout-card-copy">Creating the Stripe payment session...</p>
        ) : !validClientSecret || !stripePromise ? (
          <p className="buyer-checkout-card-copy">Stripe Payment Element will render after Medusa returns a valid payment `client_secret`.</p>
        ) : (
          <Elements stripe={stripePromise} options={{ clientSecret: session!.clientSecret, appearance: { theme: "stripe" } }}>
            <StripePaymentForm canSubmit={canSubmit} placing={placing} onComplete={onStripeComplete} stripePublishableKey={stripePublishableKey} />
          </Elements>
        )
      ) : stripeAvailable ? (
        <div className="buyer-checkout-payment-message">
          <strong>Real card payments are available</strong>
          <p>Select <em>Add new card or wallet</em> above. Saved-card management exists in account settings, but this checkout path currently confirms a new Stripe Payment Element.</p>
          <p><a href="/account/payment-methods">Manage saved payment methods</a> in your buyer account.</p>
        </div>
      ) : (
        <div className="buyer-checkout-payment-message">
          <strong>Development fallback only</strong>
          <p>Stripe is not enabled for this region yet. Set `STRIPE_API_KEY` on Medusa, restart the backend, then run:</p>
          <p><code>npm --workspace apps/medusa-backend run stripe:region:setup</code></p>
          <p>The local provider authorizes when the order is placed. It does not collect card details or prove captured funds.</p>
          <dl><div><dt>Provider</dt><dd>pp_system_default</dd></div><div><dt>Capture</dt><dd>Not available</dd></div></dl>
        </div>
      )}
    </Card>
  )
}
