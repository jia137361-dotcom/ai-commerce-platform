import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"
import { useState } from "react"
import { confirmStripePaymentAndComplete } from "../../pages/checkout/checkout-payment"
import { StripeTestModeHint } from "./StripeTestModeHint"
import { Button } from "../ui/Button"

export function StripePaymentForm({
  canSubmit,
  placing,
  onComplete,
}: {
  canSubmit: boolean
  placing: boolean
  onComplete: (paymentMethodLabel?: string) => Promise<void>
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [error, setError] = useState<string>()
  const [confirming, setConfirming] = useState(false)
  const [elementReady, setElementReady] = useState(false)

  const submit = async () => {
    if (!stripe || !elements || !elementReady || !canSubmit || confirming || placing) return
    setConfirming(true)
    setError(undefined)
    try {
      const { error: submitError } = await elements.submit()
      if (submitError) {
        throw new Error(submitError.message || "Stripe payment confirmation failed.")
      }
      await confirmStripePaymentAndComplete({
        stripe,
        elements,
        returnUrl: `${window.location.origin}/checkout`,
        complete: (paymentMethodLabel) => onComplete(paymentMethodLabel),
      })
    } catch (value) {
      setError(value instanceof Error ? value.message : "Stripe payment confirmation failed.")
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="buyer-checkout-stripe-form">
      <PaymentElement
        options={{ layout: "tabs" }}
        onReady={() => setElementReady(true)}
        onLoadError={(event) => {
          setElementReady(false)
          setError(event.error.message || "Unable to load the Stripe payment form.")
        }}
      />
      <StripeTestModeHint />
      {error ? <p className="buyer-checkout-inline-error" role="alert">{error}</p> : null}
      <Button loading={confirming || placing} disabled={!stripe || !elements || !elementReady || !canSubmit || confirming || placing} onClick={() => void submit()}>
        {placing ? "Placing order..." : confirming ? "Confirming payment..." : "Place order"}
      </Button>
    </div>
  )
}
