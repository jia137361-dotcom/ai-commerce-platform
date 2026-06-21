import { Elements } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { useMemo } from "react"
import type { BuyerPaymentProvider, BuyerPaymentSession } from "../../lib/buyer-api"
import { hasValidStripeClientSecret, isStripeProviderId } from "../../pages/checkout/checkout-payment"
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
  canSubmit?: boolean
  placing?: boolean
  onStripeComplete?: () => Promise<void>
}

export function CheckoutPaymentPanel({
  providers = [{ id: "pp_system_default", isStripe: false }],
  selectedProviderId = "pp_system_default",
  onProviderChange,
  session,
  stripePublishableKey = "",
  preparing = false,
  error,
  canSubmit = false,
  placing = false,
  onStripeComplete = async () => undefined,
}: CheckoutPaymentPanelProps) {
  const stripeSelected = isStripeProviderId(selectedProviderId)
  const validClientSecret = hasValidStripeClientSecret(session)
  const stripePromise = useMemo(
    () => stripeSelected && validClientSecret && stripePublishableKey.startsWith("pk_test_") ? loadStripe(stripePublishableKey) : null,
    [stripePublishableKey, stripeSelected, validClientSecret]
  )

  return (
    <Card as="section" className="buyer-checkout-card buyer-checkout-payment-card">
      <header><div><p>Step 4</p><h2>Payment method</h2></div><StatusBadge tone={stripeSelected && validClientSecret ? "success" : "warning"}>{stripeSelected ? validClientSecret ? "Stripe ready" : "Setup required" : "Dev fallback"}</StatusBadge></header>

      <div className="buyer-checkout-payment-providers" role="radiogroup" aria-label="Payment provider">
        {providers.map((provider) => <button key={provider.id} type="button" role="radio" aria-checked={selectedProviderId === provider.id} className={selectedProviderId === provider.id ? "active" : ""} onClick={() => onProviderChange?.(provider.id)}><strong>{provider.isStripe ? "Stripe test payment" : "System-default authorization"}</strong><span>{provider.id}</span></button>)}
      </div>

      {error ? <p className="buyer-checkout-inline-error" role="alert">{error}</p> : null}

      {stripeSelected ? (
        !stripePublishableKey.startsWith("pk_test_") ? (
          <p className="buyer-checkout-card-copy">Stripe is enabled for this region, but `VITE_STRIPE_PK` is not configured with a test publishable key.</p>
        ) : preparing ? (
          <p className="buyer-checkout-card-copy">Creating the official Medusa Stripe payment session...</p>
        ) : !validClientSecret || !stripePromise ? (
          <p className="buyer-checkout-card-copy">Stripe Payment Element will render only after Medusa returns a valid `client_secret`.</p>
        ) : (
          <Elements stripe={stripePromise} options={{ clientSecret: session!.clientSecret, appearance: { theme: "stripe" } }}>
            <StripePaymentForm canSubmit={canSubmit} placing={placing} onComplete={onStripeComplete} />
          </Elements>
        )
      ) : (
        <div className="buyer-checkout-payment-message">
          <strong>System-default authorization · development fallback</strong>
          <p>The local provider authorizes when the order is placed. It does not collect card details or prove captured funds.</p>
          <dl><div><dt>Provider</dt><dd>pp_system_default</dd></div><div><dt>Capture</dt><dd>Not available</dd></div></dl>
        </div>
      )}
    </Card>
  )
}
