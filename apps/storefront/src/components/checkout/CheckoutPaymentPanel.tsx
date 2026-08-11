import { Elements } from "@stripe/react-stripe-js"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { BuyerPaymentMethod, BuyerPaymentProvider, BuyerPaymentSession } from "../../lib/buyer-api"
import { getStripePromise } from "../../lib/stripe-loader"
import { hasValidStripeClientSecret, isPayPalProviderId, isStripeProviderId, isValidStripePublishableKey } from "../../pages/checkout/checkout-payment"
import { StripePaymentForm } from "./StripePaymentForm"
import { PayPalPaymentButton } from "./PayPalPaymentButton"
import { Card } from "../ui/Card"
import { StatusBadge } from "../ui/StatusBadge"

type CheckoutPaymentPanelProps = {
  providers?: BuyerPaymentProvider[]
  selectedProviderId?: string
  onProviderChange?: (providerId: string) => void
  session?: BuyerPaymentSession | null
  stripePublishableKey?: string
  paypalClientId?: string
  currencyCode?: string
  amountMinor?: number
  preparing?: boolean
  waitingForShipping?: boolean
  error?: string
  canSubmit?: boolean
  placing?: boolean
  savedPaymentMethods?: BuyerPaymentMethod[]
  selectedSavedPaymentMethodId?: string | null
  onSavedPaymentMethodChange?: (paymentMethodId: string | null) => void
  onStripeComplete?: (paymentMethodLabel?: string) => Promise<void>
  onPayPalComplete?: () => Promise<void>
  recoveryAction?: "confirm_payment" | "complete_order" | "wait" | "completed"
  onPaymentError?: (message: string) => void
}

export type StripeLifecycle =
  | "idle"
  | "stripe_js_loading"
  | "stripe_js_ready"
  | "stripe_js_error"
  | "elements_initializing"
  | "payment_element_ready"
  | "payment_element_error"

export const shouldChangePaymentProvider = (selectedProviderId: string, providerId: string) =>
  Boolean(providerId.trim() && providerId !== selectedProviderId)

export const describeStripeReadiness = (input: {
  usingSavedMethod: boolean
  preparing: boolean
  hasClientSecret: boolean
  lifecycle: StripeLifecycle
}) => {
  if (input.usingSavedMethod) return "Saved card"
  if (input.preparing || !input.hasClientSecret) return input.preparing ? "Preparing card payment" : "Setup required"
  if (input.lifecycle === "payment_element_ready") return "Card form ready"
  if (input.lifecycle === "stripe_js_error" || input.lifecycle === "payment_element_error") return "Unable to load Stripe"
  return "Loading secure card form"
}

export function CheckoutPaymentPanel({
  providers = [{ id: "pp_system_default", isStripe: false }],
  selectedProviderId = "pp_system_default",
  onProviderChange,
  session,
  stripePublishableKey = "",
  paypalClientId = "",
  currencyCode = "usd",
  amountMinor,
  preparing = false,
  waitingForShipping = false,
  error,
  canSubmit = false,
  placing = false,
  savedPaymentMethods = [],
  selectedSavedPaymentMethodId = null,
  onSavedPaymentMethodChange,
  onStripeComplete = async () => undefined,
  onPayPalComplete = async () => undefined,
  recoveryAction = "confirm_payment",
  onPaymentError,
}: CheckoutPaymentPanelProps) {
  const stripeSelected = isStripeProviderId(selectedProviderId)
  const paypalSelected = isPayPalProviderId(selectedProviderId)
  const validClientSecret = hasValidStripeClientSecret(session)
  const stripeReady = isValidStripePublishableKey(stripePublishableKey)
  const stripeAvailable = providers.some((provider) => provider.isStripe)
  const paypalAvailable = providers.some((provider) => provider.isPayPal || isPayPalProviderId(provider.id))
  const selectableProviders = providers.filter((provider) =>
    provider.isStripe || provider.isPayPal || isStripeProviderId(provider.id) || isPayPalProviderId(provider.id)
  )
  const usingSavedMethod = Boolean(selectedSavedPaymentMethodId)
  const recoveringOrder = recoveryAction === "complete_order"
  const waitingForPayment = recoveryAction === "wait"
  const [stripeLifecycle, setStripeLifecycle] = useState<StripeLifecycle>("idle")
  const [stripeLoadRevision, setStripeLoadRevision] = useState(0)
  const onPaymentErrorRef = useRef(onPaymentError)
  onPaymentErrorRef.current = onPaymentError
  const reportPaymentError = useCallback((message: string) => onPaymentErrorRef.current?.(message), [])
  const stripePromise = useMemo(
    () =>
      stripeSelected && validClientSecret && stripeReady && !usingSavedMethod && !recoveringOrder && !waitingForPayment
        ? getStripePromise(stripePublishableKey)
        : null,
    [stripePublishableKey, stripeSelected, validClientSecret, stripeReady, usingSavedMethod, recoveringOrder, waitingForPayment, stripeLoadRevision]
  )

  useEffect(() => {
    if (!stripePromise) {
      setStripeLifecycle("idle")
      return
    }
    let active = true
    setStripeLifecycle("stripe_js_loading")
    console.info("stripe_js_loading", { payment_session_id: session?.id ?? null })
    void stripePromise.then(
      (stripe) => {
        if (!active) return
        if (!stripe) {
          setStripeLifecycle("stripe_js_error")
          reportPaymentError("Unable to load Stripe. Check your network connection, content blocker, or browser privacy settings, then retry.")
          console.info("stripe_js_error", { payment_session_id: session?.id ?? null, message: "Stripe.js returned no instance" })
          return
        }
        setStripeLifecycle("stripe_js_ready")
        console.info("stripe_js_ready", { payment_session_id: session?.id ?? null })
      },
      (reason) => {
        if (!active) return
        const message = reason instanceof Error ? reason.message : "Unable to load Stripe.js."
        setStripeLifecycle("stripe_js_error")
        reportPaymentError("Unable to load Stripe. Check your network connection, content blocker, or browser privacy settings, then retry.")
        console.info("stripe_js_error", { payment_session_id: session?.id ?? null, message })
      }
    )
    return () => { active = false }
  }, [reportPaymentError, session?.id, stripePromise])

  const handleStripeLifecycle = useCallback((state: "elements_initializing" | "payment_element_ready" | "payment_element_error", message?: string) => {
    setStripeLifecycle(state)
    if (state === "elements_initializing") {
      console.info("elements_initializing", { payment_session_id: session?.id ?? null })
      return
    }
    if (state === "payment_element_ready") {
      console.info("payment_element_ready", { payment_session_id: session?.id ?? null })
      return
    }
    const safeMessage = message || "Unable to load the Stripe payment form."
    console.info("payment_element_error", { payment_session_id: session?.id ?? null, message: safeMessage })
    reportPaymentError(safeMessage)
  }, [reportPaymentError, session?.id])

  return (
    <Card as="section" className="buyer-checkout-card buyer-checkout-payment-card">
      <header>
        <div>
          <p>Payment</p>
          <h2>Payment method</h2>
        </div>
        <StatusBadge
          tone={
            stripeSelected && (stripeLifecycle === "payment_element_ready" || usingSavedMethod)
              ? "success"
              : stripeAvailable
                ? "warning"
                : "neutral"
          }
        >
          {stripeSelected
            ? waitingForShipping
              ? "Waiting for delivery"
              : describeStripeReadiness({
                usingSavedMethod,
                preparing,
                hasClientSecret: validClientSecret,
                lifecycle: stripeLifecycle,
              })
              : paypalAvailable
                ? "PayPal available"
                : "Unavailable"}
        </StatusBadge>
      </header>

      <div className="buyer-checkout-payment-providers" role="radiogroup" aria-label="Payment method">
        {selectableProviders.map((provider) => (
          <button
            key={provider.id}
            type="button"
            role="radio"
            aria-checked={selectedProviderId === provider.id}
            className={selectedProviderId === provider.id ? "active" : ""}
            onClick={() => {
              if (!shouldChangePaymentProvider(selectedProviderId, provider.id)) return
              onProviderChange?.(provider.id)
            }}
          >
            <strong>{provider.isStripe || isStripeProviderId(provider.id) ? "Card" : "PayPal"}</strong>
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
            <strong>Confirm delivery first</strong>
            <p>
              Choose or add a delivery address. Freight is calculated automatically and card payment unlocks after the
              checkout has a valid shipping total.
            </p>
          </div>
        ) : recoveringOrder ? (
          <div className="buyer-checkout-payment-message">
            <strong>Payment confirmed</strong>
            <p>We are restoring the order for this cart. Do not enter card details or start another payment.</p>
          </div>
        ) : waitingForPayment ? (
          <div className="buyer-checkout-payment-message">
            <strong>Payment processing</strong>
            <p>The payment network is still processing this charge. We will let you continue when it resolves.</p>
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
                Selected saved card will be charged when you click <strong>Pay now</strong>.
              </p>
            ) : preparing ? (
              <p className="buyer-checkout-card-copy">
                Creating the Stripe payment session… This contacts Stripe and can take longer on slow networks.
              </p>
            ) : stripeLifecycle === "stripe_js_error" ? (
              <div className="buyer-checkout-payment-message">
                <strong>Unable to load Stripe</strong>
                <p>The secure card form did not download. Check your network connection, content blocker, or browser privacy settings.</p>
                <button type="button" onClick={() => {
                  setStripeLoadRevision((revision) => revision + 1)
                  reportPaymentError("")
                }}>Retry secure card form</button>
              </div>
            ) : !validClientSecret || !stripePromise ? (
              <div className="buyer-checkout-payment-message">
                <strong>Preparing secure payment</strong>
                <p>
                  We are refreshing the payment session for this cart. If the card form does not appear after a moment,
                  reload checkout or choose the delivery address again.
                </p>
              </div>
            ) : (
              <Elements
                key={session!.id}
                stripe={stripePromise}
                options={{ clientSecret: session!.clientSecret, appearance: { theme: "stripe" } }}
              >
                <StripePaymentForm
                  canSubmit={canSubmit}
                  placing={placing}
                  onComplete={onStripeComplete}
                  onLifecycleChange={handleStripeLifecycle}
                />
              </Elements>
            )}
          </>
        )
      ) : paypalSelected ? (
        waitingForShipping ? (
          <div className="buyer-checkout-payment-message">
            <strong>Confirm delivery first</strong>
            <p>PayPal will appear after the delivery address and shipping total are confirmed.</p>
          </div>
        ) : recoveringOrder ? (
          <div className="buyer-checkout-payment-message">
            <strong>Payment confirmed</strong>
            <p>We are restoring the order for this cart. Do not start another PayPal payment.</p>
          </div>
        ) : waitingForPayment ? (
          <div className="buyer-checkout-payment-message">
            <strong>Payment processing</strong>
            <p>The payment network is still processing this charge. We will let you continue when it resolves.</p>
          </div>
        ) : preparing || !session?.paypalOrderId ? (
          <div className="buyer-checkout-payment-message">
            <strong>Preparing PayPal Sandbox</strong>
            <p>PayPal will appear when the backend payment session is ready.</p>
          </div>
        ) : (
          <PayPalPaymentButton
            clientId={paypalClientId}
            currencyCode={currencyCode}
            amountMinor={amountMinor}
            session={session}
            disabled={!canSubmit || placing}
            placing={placing}
            onApprove={onPayPalComplete}
            onError={reportPaymentError}
          />
        )
      ) : stripeAvailable ? (
        <div className="buyer-checkout-payment-message">
          <strong>Card payments are available</strong>
          <p>
            Select <em>Card</em> above. If it stays on the fallback, configure `VITE_STRIPE_PK`
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
