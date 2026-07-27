import { Elements } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { useMemo } from "react"
import type { BuyerPaymentMethod, BuyerPaymentProvider, BuyerPaymentSession } from "../../lib/buyer-api"
import { hasValidStripeClientSecret, isStripeProviderId, isValidStripePublishableKey } from "../../pages/checkout/checkout-payment"
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
  waitingForShipping?: boolean
  error?: string
  canSubmit?: boolean
  placing?: boolean
  savedPaymentMethods?: BuyerPaymentMethod[]
  selectedSavedPaymentMethodId?: string | null
  onSavedPaymentMethodChange?: (paymentMethodId: string | null) => void
  onStripeComplete?: (paymentMethodLabel?: string) => Promise<void>
}

export function CheckoutPaymentPanel({
  providers = [{ id: "pp_system_default", isStripe: false }],
  selectedProviderId = "pp_system_default",
  onProviderChange,
  session,
  stripePublishableKey = "",
  preparing = false,
  waitingForShipping = false,
  error,
  canSubmit = false,
  placing = false,
  savedPaymentMethods = [],
  selectedSavedPaymentMethodId = null,
  onSavedPaymentMethodChange,
  onStripeComplete = async () => undefined,
}: CheckoutPaymentPanelProps) {
  const stripeSelected = isStripeProviderId(selectedProviderId)
  const validClientSecret = hasValidStripeClientSecret(session)
  const stripeReady = isValidStripePublishableKey(stripePublishableKey)
  const stripeAvailable = providers.some((provider) => provider.isStripe)
  const usingSavedMethod = Boolean(selectedSavedPaymentMethodId)
  const stripePromise = useMemo(
    () =>
      stripeSelected && validClientSecret && stripeReady && !usingSavedMethod
        ? loadStripe(stripePublishableKey)
        : null,
    [stripePublishableKey, stripeSelected, validClientSecret, stripeReady, usingSavedMethod]
  )

  return (
    <Card as="section" className="buyer-checkout-card buyer-checkout-payment-card">
      <header>
        <div>
          <p>Step 3</p>
          <h2>Payment method</h2>
        </div>
        <StatusBadge
          tone={
            stripeSelected && (validClientSecret || usingSavedMethod)
              ? "success"
              : stripeAvailable
                ? "warning"
                : "neutral"
          }
        >
          {stripeSelected
            ? usingSavedMethod
              ? "Saved card"
              : validClientSecret
                ? "Stripe ready"
                : waitingForShipping
                  ? "Waiting for shipping"
                  : "Setup required"
            : stripeAvailable
              ? "Stripe available"
              : "Dev fallback"}
        </StatusBadge>
      </header>

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
            <strong>{provider.isStripe ? "Card, Apple Pay, Google Pay" : "System-default authorization"}</strong>
          </button>
        ))}
      </div>

      {error ? <p className="buyer-checkout-inline-error" role="alert">{error}</p> : null}

      {stripeSelected ? (
        !stripeReady ? (
          <div className="buyer-checkout-payment-message">
            <strong>Stripe publishable key required</strong>
            <p>Add `VITE_STRIPE_PK=pk_test_...` to `apps/storefront/.env.local`, restart the storefront, then reload checkout.</p>
            <p>
              You can also save cards in <a href="/account/payment-methods">Account → Payment methods</a> once Stripe is
              configured.
            </p>
          </div>
        ) : waitingForShipping ? (
          <div className="buyer-checkout-payment-message">
            <strong>Select shipping first</strong>
            <p>
              Save your delivery address in Step 1 and choose a shipping method in Step 2. Card payment unlocks after
              shipping is confirmed (live freight quotes usually finish within a few seconds).
            </p>
          </div>
        ) : (
          <>
            {savedPaymentMethods.length ? (
              <div className="buyer-checkout-saved-payments" role="radiogroup" aria-label="Saved payment methods">
                <strong>Saved cards</strong>
                {savedPaymentMethods.map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    role="radio"
                    aria-checked={selectedSavedPaymentMethodId === method.id}
                    className={selectedSavedPaymentMethodId === method.id ? "active" : ""}
                    onClick={() => onSavedPaymentMethodChange?.(method.id)}
                  >
                    <span>
                      <strong>{method.label}</strong>
                      {method.expMonth && method.expYear ? (
                        <small>
                          Expires {String(method.expMonth).padStart(2, "0")}/{method.expYear}
                          {method.isDefault ? " · Default" : ""}
                        </small>
                      ) : method.isDefault ? (
                        <small>Default</small>
                      ) : null}
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  role="radio"
                  aria-checked={!selectedSavedPaymentMethodId}
                  className={!selectedSavedPaymentMethodId ? "active" : ""}
                  onClick={() => onSavedPaymentMethodChange?.(null)}
                >
                  <span>
                    <strong>Use a new card</strong>
                    <small>Enter card details below</small>
                  </span>
                </button>
                <p className="buyer-checkout-card-copy">
                  Manage cards in <a href="/account/payment-methods">Account → Payment methods</a>.
                </p>
              </div>
            ) : (
              <p className="buyer-checkout-card-copy">
                No saved cards yet. You can add one in{" "}
                <a href="/account/payment-methods">Account → Payment methods</a>, or pay with a new card below.
              </p>
            )}

            {usingSavedMethod ? (
              <p className="buyer-checkout-card-copy">
                Selected saved card will be charged when you click <strong>Place order</strong>.
              </p>
            ) : preparing ? (
              <p className="buyer-checkout-card-copy">
                Creating the Stripe payment session… This contacts Stripe and can take longer on slow networks.
              </p>
            ) : !validClientSecret || !stripePromise ? (
              <div className="buyer-checkout-payment-message">
                <strong>Unable to start Stripe payment</strong>
                <p>
                  Medusa did not return a payment `client_secret`. Confirm shipping is saved, then reload checkout. If it
                  still fails, restart Medusa after checking `STRIPE_API_KEY`.
                </p>
              </div>
            ) : (
              <Elements
                stripe={stripePromise}
                options={{ clientSecret: session!.clientSecret, appearance: { theme: "stripe" } }}
              >
                <StripePaymentForm canSubmit={canSubmit} placing={placing} onComplete={onStripeComplete} />
              </Elements>
            )}
          </>
        )
      ) : stripeAvailable ? (
        <div className="buyer-checkout-payment-message">
          <strong>Real card payments are available</strong>
          <p>
            Select <em>Card, Apple Pay, Google Pay</em> above. If it stays on the dev fallback, configure `VITE_STRIPE_PK`
            in the storefront and restart Medusa after setting `STRIPE_API_KEY`.
          </p>
          <p>
            <a href="/account/payment-methods">Manage saved payment methods</a> in your buyer account.
          </p>
        </div>
      ) : (
        <div className="buyer-checkout-payment-message">
          <strong>Development fallback only</strong>
          <p>Stripe is not enabled for this region yet. Set `STRIPE_API_KEY` on Medusa, restart the backend, then run:</p>
          <p>
            <code>npm --workspace apps/medusa-backend run stripe:region:setup</code>
          </p>
          <p>
            The local provider authorizes when the order is placed. It does not collect card details or prove captured
            funds.
          </p>
          <dl>
            <div>
              <dt>Provider</dt>
              <dd>pp_system_default</dd>
            </div>
            <div>
              <dt>Capture</dt>
              <dd>Not available</dd>
            </div>
          </dl>
        </div>
      )}
    </Card>
  )
}
