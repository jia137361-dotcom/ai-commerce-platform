import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"
import { useState } from "react"
import { confirmStripePaymentAndComplete } from "../../pages/checkout/checkout-payment"
import { Button } from "../ui/Button"

export function StripePaymentForm({
  canSubmit,
  placing,
  onComplete,
}: {
  canSubmit: boolean
  placing: boolean
  onComplete: () => Promise<void>
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [error, setError] = useState<string>()
  const [confirming, setConfirming] = useState(false)

  const submit = async () => {
    if (!stripe || !elements || !canSubmit || confirming || placing) return
    setConfirming(true)
    setError(undefined)
    try {
      await confirmStripePaymentAndComplete({
        stripe,
        elements,
        returnUrl: `${window.location.origin}/checkout`,
        complete: onComplete,
      })
    } catch (value) {
      setError(value instanceof Error ? value.message : "Stripe payment confirmation failed.")
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="buyer-checkout-stripe-form">
      <PaymentElement />
      {error ? <p className="buyer-checkout-inline-error" role="alert">{error}</p> : null}
      <Button loading={confirming || placing} disabled={!stripe || !elements || !canSubmit || confirming || placing} onClick={() => void submit()}>
        {placing ? "Creating order..." : confirming ? "Confirming payment..." : "Pay with Stripe and place order"}
      </Button>
    </div>
  )
}
