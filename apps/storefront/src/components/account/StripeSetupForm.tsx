import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"
import { useState } from "react"
import { StripeTestModeHint } from "../checkout/StripeTestModeHint"
import { Button } from "../ui/Button"

export function StripeSetupForm({
  onComplete,
  onCancel,
}: {
  onComplete: () => Promise<void>
  onCancel: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [error, setError] = useState<string>()
  const [confirming, setConfirming] = useState(false)
  const [elementReady, setElementReady] = useState(false)

  const submit = async () => {
    if (!stripe || !elements || !elementReady || confirming) return
    setConfirming(true)
    setError(undefined)
    try {
      const { error: submitError } = await elements.submit()
      if (submitError) {
        throw new Error(submitError.message || "Unable to save this payment method.")
      }
      const result = await stripe.confirmSetup({
        elements,
        redirect: "if_required",
        confirmParams: { return_url: `${window.location.origin}/account/payment-methods` },
      })
      if (result.error) {
        throw new Error(result.error.message || "Unable to save this payment method.")
      }
      await onComplete()
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to save this payment method.")
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="buyer-payment-method-setup">
      <PaymentElement
        options={{ layout: "tabs" }}
        onReady={() => setElementReady(true)}
        onLoadError={(event) => {
          setElementReady(false)
          setError(event.error.message || "Unable to load the Stripe payment form.")
        }}
      />
      <StripeTestModeHint />
      <p className="buyer-account-setting-note">
        Choose Card (Visa/Mastercard), Apple Pay, or Google Pay. Wallet tabs appear when your browser and Stripe test account support them.
      </p>
      {error ? <p className="buyer-account-error" role="alert">{error}</p> : null}
      <div className="buyer-account-actions">
        <Button loading={confirming} disabled={!stripe || !elements || !elementReady || confirming} onClick={() => void submit()}>
          Save payment method
        </Button>
        <Button variant="secondary" disabled={confirming} onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}
