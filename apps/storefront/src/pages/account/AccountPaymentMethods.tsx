import { Elements } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { useEffect, useMemo, useState } from "react"
import { StripeSetupForm } from "../../components/account/StripeSetupForm"
import { Button } from "../../components/ui/Button"
import { LoadingState } from "../../components/ui/States"
import {
  createCustomerPaymentMethodSetup,
  deleteCustomerPaymentMethod,
  getStripePublishableKey,
  listCustomerPaymentMethods,
  setDefaultCustomerPaymentMethod,
  type BuyerPaymentMethod,
} from "../../lib/buyer-api"
import { isValidStripePublishableKey } from "../checkout/checkout-payment"

function paymentMethodIcon(method: BuyerPaymentMethod) {
  if (method.walletType === "apple_pay") return ""
  if (method.walletType === "google_pay") return "G"
  return method.brand?.slice(0, 1).toUpperCase() ?? "💳"
}

export function AccountPaymentMethods() {
  const stripePublishableKey = getStripePublishableKey()
  const stripeReady = isValidStripePublishableKey(stripePublishableKey)
  const [methods, setMethods] = useState<BuyerPaymentMethod[]>([])
  const [stripeConfigured, setStripeConfigured] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [adding, setAdding] = useState(false)
  const [setupSecret, setSetupSecret] = useState<string>()
  const [busyId, setBusyId] = useState<string>()

  const stripePromise = useMemo(
    () => (stripeReady && setupSecret ? loadStripe(stripePublishableKey) : null),
    [setupSecret, stripePublishableKey, stripeReady]
  )

  const refresh = async () => {
    const result = await listCustomerPaymentMethods()
    setMethods(result.paymentMethods)
    setStripeConfigured(result.stripeConfigured)
  }

  useEffect(() => {
    void refresh()
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load payment methods."))
      .finally(() => setLoading(false))
  }, [])

  const startAdd = async () => {
    setError(undefined)
    if (!stripeReady) {
      setError("Configure VITE_STRIPE_PK in apps/storefront/.env.local, then restart the storefront.")
      return
    }
    if (!stripeConfigured) {
      setError("Stripe is not configured on the Medusa backend (STRIPE_API_KEY).")
      return
    }
    setAdding(true)
    try {
      const setup = await createCustomerPaymentMethodSetup()
      setSetupSecret(setup.clientSecret)
    } catch (reason) {
      setAdding(false)
      setError(reason instanceof Error ? reason.message : "Unable to start card setup.")
    }
  }

  const finishAdd = async () => {
    setAdding(false)
    setSetupSecret(undefined)
    await refresh()
  }

  if (loading) {
    return <LoadingState label="Loading saved payment methods..." />
  }

  return (
    <>
      {error ? <p className="buyer-account-error" role="alert">{error}</p> : null}

      {!stripeConfigured ? (
        <div className="buyer-account-empty-state">
          <span aria-hidden="true">💳</span>
          <h2>Stripe is not configured</h2>
          <p>Set STRIPE_API_KEY on Medusa, restart the backend, then run stripe:region:setup.</p>
        </div>
      ) : !stripeReady ? (
        <div className="buyer-account-empty-state">
          <span aria-hidden="true">💳</span>
          <h2>Publishable key required</h2>
          <p>Add VITE_STRIPE_PK=pk_test_... to apps/storefront/.env.local and restart the storefront.</p>
        </div>
      ) : adding && setupSecret && stripePromise ? (
        <Elements stripe={stripePromise} options={{ clientSecret: setupSecret, appearance: { theme: "stripe" } }}>
          <StripeSetupForm onComplete={finishAdd} onCancel={() => { setAdding(false); setSetupSecret(undefined) }} />
        </Elements>
      ) : methods.length ? (
        <div className="buyer-payment-method-list">
          {methods.map((method) => (
            <article key={method.id} className={method.isDefault ? "default" : ""}>
              <div className="buyer-payment-method-icon" aria-hidden="true">{paymentMethodIcon(method)}</div>
              <div>
                <h2>{method.label}</h2>
                {method.expMonth && method.expYear ? <p>Expires {String(method.expMonth).padStart(2, "0")}/{method.expYear}</p> : null}
                {method.isDefault ? <small>Default</small> : null}
              </div>
              <div className="buyer-address-actions">
                {!method.isDefault ? (
                  <Button
                    variant="secondary"
                    loading={busyId === method.id}
                    onClick={() => {
                      setBusyId(method.id)
                      void setDefaultCustomerPaymentMethod(method.id)
                        .then((result) => setMethods(result.paymentMethods))
                        .catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to set default."))
                        .finally(() => setBusyId(undefined))
                    }}
                  >
                    Make default
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  loading={busyId === method.id}
                  onClick={() => {
                    if (!window.confirm("Remove this saved payment method?")) return
                    setBusyId(method.id)
                    void deleteCustomerPaymentMethod(method.id)
                      .then((result) => setMethods(result.paymentMethods))
                      .catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to remove payment method."))
                      .finally(() => setBusyId(undefined))
                  }}
                >
                  Remove
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="buyer-account-empty-state">
          <span aria-hidden="true">💳</span>
          <h2>No saved payment methods</h2>
          <p>Save a Visa/Mastercard or wallet (Apple Pay / Google Pay) for faster checkout.</p>
        </div>
      )}

      {!adding ? (
        <footer className="buyer-account-settings-footer">
          <Button onClick={() => void startAdd()} disabled={!stripeConfigured || !stripeReady}>
            Add payment method
          </Button>
        </footer>
      ) : null}
    </>
  )
}
