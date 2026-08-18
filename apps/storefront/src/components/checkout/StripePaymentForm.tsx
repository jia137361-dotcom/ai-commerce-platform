import { ExpressCheckoutElement, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"
import { useEffect, useMemo, useState } from "react"
import type {
  StripeExpressCheckoutElementConfirmEvent,
  StripeExpressCheckoutElementReadyEvent,
} from "@stripe/stripe-js"
import {
  getStripeWalletRuntimeDiagnostic,
  normalizeStripeWalletAvailability,
  resolveStripeWalletContainerClass,
  resolveStripeWalletPresentationOptions,
  type StripeWalletAvailability,
} from "../../lib/stripe-wallet"
import {
  confirmStripePaymentAndComplete,
  confirmStripeWalletPaymentAndComplete,
  persistStripeCheckoutReturnContext,
  StripePaymentConfirmedOrderRecoveryError,
} from "../../pages/checkout/checkout-payment"
import { Button } from "../ui/Button"

const WALLET_READINESS_TIMEOUT_MS = 5000

export function StripePaymentForm({
  canSubmit,
  placing,
  onComplete,
  onLifecycleChange,
  returnUrl,
}: {
  canSubmit: boolean
  placing: boolean
  onComplete: (paymentMethodLabel?: string) => Promise<void>
  onLifecycleChange?: (state: "elements_initializing" | "payment_element_ready" | "payment_element_error", message?: string) => void
  returnUrl: string
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [error, setError] = useState<string>()
  const [confirming, setConfirming] = useState(false)
  const [paymentConfirmed, setPaymentConfirmed] = useState(false)
  const [elementReady, setElementReady] = useState(false)
  const [walletAvailability, setWalletAvailability] = useState<StripeWalletAvailability>(() => normalizeStripeWalletAvailability())
  const [walletAvailabilityKnown, setWalletAvailabilityKnown] = useState(false)
  const isDevelopment = import.meta.env.DEV
  const walletOptions = useMemo(
    () => resolveStripeWalletPresentationOptions(isDevelopment),
    [isDevelopment]
  )
  const walletRuntime = useMemo(
    () =>
      getStripeWalletRuntimeDiagnostic({
        origin: typeof window === "undefined" ? undefined : window.location.origin,
        protocol: typeof window === "undefined" ? undefined : window.location.protocol,
        userAgent: typeof navigator === "undefined" ? undefined : navigator.userAgent,
      }),
    []
  )

  useEffect(() => {
    onLifecycleChange?.("elements_initializing")
    // A new callback identity must not restart Element initialization.
    // The provider remount key handles actual payment-session replacements.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (walletAvailabilityKnown) return
    const timeout = window.setTimeout(() => {
      setWalletAvailability(normalizeStripeWalletAvailability())
      setWalletAvailabilityKnown(true)
      if (isDevelopment) {
        console.info("express_checkout_wallet_availability_timeout", {
          apple_pay_available: false,
          google_pay_available: false,
          ...walletRuntime,
        })
      }
    }, WALLET_READINESS_TIMEOUT_MS)
    return () => window.clearTimeout(timeout)
  }, [isDevelopment, walletAvailabilityKnown, walletRuntime])

  const reportPaymentElementError = (message: string) => {
    setElementReady(false)
    setError(message)
    onLifecycleChange?.("payment_element_error", message)
  }

  const submit = async () => {
    if (!stripe || !elements || !elementReady || !canSubmit || confirming || placing || paymentConfirmed) return
    setConfirming(true)
    setError(undefined)
    try {
      persistStripeCheckoutReturnContext(returnUrl, window.localStorage)
      const { error: submitError } = await elements.submit()
      if (submitError) {
        throw new Error(submitError.message || "Stripe payment confirmation failed.")
      }
      await confirmStripePaymentAndComplete({
        stripe,
        elements,
        returnUrl,
        complete: (paymentMethodLabel) => onComplete(paymentMethodLabel),
      })
    } catch (value) {
      if (value instanceof StripePaymentConfirmedOrderRecoveryError) {
        setPaymentConfirmed(true)
      }
      setError(value instanceof Error ? value.message : "Stripe payment confirmation failed.")
    } finally {
      setConfirming(false)
    }
  }

  const submitWallet = async (event: StripeExpressCheckoutElementConfirmEvent) => {
    if (!stripe || !elements || !canSubmit || confirming || placing || paymentConfirmed) {
      event.paymentFailed({ message: "Finish checkout details before paying." })
      return
    }
    setConfirming(true)
    setError(undefined)
    try {
      persistStripeCheckoutReturnContext(returnUrl, window.localStorage)
      await confirmStripeWalletPaymentAndComplete({
        stripe,
        elements,
        returnUrl,
        complete: (paymentMethodLabel) => onComplete(paymentMethodLabel),
      })
    } catch (value) {
      const message = value instanceof Error ? value.message : "Stripe wallet confirmation failed."
      if (value instanceof StripePaymentConfirmedOrderRecoveryError) {
        setPaymentConfirmed(true)
      }
      setError(message)
      event.paymentFailed({ message })
    } finally {
      setConfirming(false)
    }
  }

  const handleWalletReady = (event: StripeExpressCheckoutElementReadyEvent) => {
    const availability = normalizeStripeWalletAvailability(event.availablePaymentMethods)
    setWalletAvailabilityKnown(true)
    setWalletAvailability(availability)
    if (isDevelopment) {
      console.info("express_checkout_wallet_availability", {
        apple_pay_available: availability.applePay,
        google_pay_available: availability.googlePay,
        ...walletRuntime,
      })
    }
  }

  const walletAvailable = walletAvailability.applePay || walletAvailability.googlePay

  return (
    <div className="buyer-checkout-stripe-form">
      <div className={resolveStripeWalletContainerClass(walletAvailabilityKnown, walletAvailability)}>
        <strong className="buyer-checkout-wallet-heading">Express checkout</strong>
        <ExpressCheckoutElement
          options={walletOptions}
          onReady={handleWalletReady}
          onAvailablePaymentMethodsChange={(event) => {
            const availability = normalizeStripeWalletAvailability(event.paymentMethods)
            setWalletAvailabilityKnown(true)
            setWalletAvailability(availability)
          }}
          onConfirm={(event) => void submitWallet(event)}
          onLoadError={(event) => {
            // Wallet availability is optional. Leave the card form usable.
            setWalletAvailabilityKnown(true)
            setWalletAvailability(normalizeStripeWalletAvailability())
            if (isDevelopment) console.info("express_checkout_element_error", { message: event.error.message, ...walletRuntime })
          }}
        />
      </div>
      {walletAvailable ? <p className="buyer-checkout-payment-divider"><span>or pay with card</span></p> : null}
      <PaymentElement
        options={{ layout: "tabs" }}
        onReady={() => {
          setElementReady(true)
          onLifecycleChange?.("payment_element_ready")
        }}
        onLoadError={(event) => {
          reportPaymentElementError(event.error.message || "Unable to load the Stripe payment form.")
        }}
      />
      {error ? <p className="buyer-checkout-inline-error" role="alert">{error}</p> : null}
      <Button loading={confirming || placing || paymentConfirmed} disabled={!stripe || !elements || !elementReady || !canSubmit || confirming || placing || paymentConfirmed} onClick={() => void submit()}>
        {paymentConfirmed ? "Restoring order..." : placing ? "Finalizing order..." : confirming ? "Confirming payment..." : "Pay now"}
      </Button>
    </div>
  )
}
