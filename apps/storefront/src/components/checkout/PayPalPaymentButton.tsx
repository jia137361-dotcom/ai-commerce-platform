import { useEffect, useRef, useState } from "react"
import type { BuyerPaymentSession } from "../../lib/buyer-api"
import { isPayPalProviderOrderId } from "../../lib/paypal-payment-session"
import { Button } from "../ui/Button"

type PayPalButtons = {
  render: (element: HTMLElement) => Promise<void>
  close?: () => void
}

type PayPalNamespace = {
  Buttons: (options: {
    style?: Record<string, unknown>
    createOrder: () => Promise<string> | string
    onApprove: (data: { orderID?: string }) => Promise<void> | void
    onClick?: (data: unknown, actions: { enable?: () => void; disable?: () => void }) => void
    onCancel?: () => void
    onError?: (error: unknown) => void
  }) => PayPalButtons
}

declare global {
  interface Window {
    paypal?: PayPalNamespace
  }
}

const paypalSdkPromises = new Map<string, Promise<PayPalNamespace>>()

const maskId = (value: string | undefined) =>
  value && value.length > 6 ? `${value.slice(0, 3)}...${value.slice(-3)}` : "missing"

const logPayPalLifecycle = (
  stage: string,
  input: { session: BuyerPaymentSession; currencyCode: string; amountMinor?: number }
) => {
  const amountMinor = Number.isFinite(input.amountMinor) ? input.amountMinor : null
  console.info(`paypal_${stage}`, {
    payment_session_id: input.session.id,
    paypal_order_id: maskId(input.session.paypalOrderId),
    amount_minor: amountMinor,
    amount_major: amountMinor == null ? null : (amountMinor / 100).toFixed(2),
    currency: input.currencyCode.toUpperCase(),
  })
}

const loadPayPalSdk = (clientId: string, currencyCode: string) => {
  if (typeof window === "undefined") return Promise.reject(new Error("PayPal is only available in a browser."))
  const key = `${clientId}:${currencyCode.toUpperCase()}`
  const existing = paypalSdkPromises.get(key)
  if (existing) return existing
  const configuredScript = document.querySelector<HTMLScriptElement>('script[data-paypal-sdk-key]')
  if (window.paypal && configuredScript?.dataset.paypalSdkKey === key) return Promise.resolve(window.paypal)
  if (window.paypal && configuredScript?.dataset.paypalSdkKey !== key) {
    return Promise.reject(new Error("PayPal SDK is already loaded for a different checkout configuration."))
  }

  const promise = new Promise<PayPalNamespace>((resolve, reject) => {
      const script = document.createElement("script")
      const query = new URLSearchParams({
        "client-id": clientId,
        currency: currencyCode.toUpperCase(),
        intent: "capture",
        components: "buttons",
      })
      script.src = `https://www.paypal.com/sdk/js?${query.toString()}`
      script.async = true
      script.dataset.paypalSdkKey = key
      script.onload = () => window.paypal ? resolve(window.paypal) : reject(new Error("PayPal SDK loaded without Buttons."))
      script.onerror = () => reject(new Error("Unable to load PayPal Sandbox."))
      document.head.appendChild(script)
  })
  paypalSdkPromises.set(key, promise)
  void promise.catch(() => {
    if (paypalSdkPromises.get(key) === promise) paypalSdkPromises.delete(key)
    const failedScript = document.querySelector<HTMLScriptElement>(`script[data-paypal-sdk-key="${key}"]`)
    failedScript?.remove()
  })
  return promise
}

export function PayPalPaymentButton({
  clientId,
  currencyCode,
  session,
  disabled,
  placing,
  onApprove,
  onCancel,
  onError,
  amountMinor,
}: {
  clientId: string
  currencyCode: string
  session: BuyerPaymentSession
  disabled: boolean
  placing: boolean
  onApprove: () => Promise<void>
  onCancel?: () => void
  onError?: (message: string) => void
  amountMinor?: number
}) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const buttonsRef = useRef<PayPalButtons | null>(null)
  const onApproveRef = useRef(onApprove)
  const onCancelRef = useRef(onCancel)
  const onErrorRef = useRef(onError)
  onApproveRef.current = onApprove
  onCancelRef.current = onCancel
  onErrorRef.current = onError
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [retryVersion, setRetryVersion] = useState(0)
  const approveInFlightRef = useRef(false)

  useEffect(() => {
    let active = true
    const mount = mountRef.current
    if (!mount || !clientId.trim() || !isPayPalProviderOrderId(session.paypalOrderId)) {
      setLoading(false)
      return
    }
    mount.replaceChildren()
    setLoading(true)
    setError(undefined)
    logPayPalLifecycle("sdk_loading", { session, currencyCode, amountMinor })
    void loadPayPalSdk(clientId, currencyCode)
      .then((paypal) => {
        if (!active || !mount || !session.paypalOrderId) return
        logPayPalLifecycle("button_initializing", { session, currencyCode, amountMinor })
        const buttons = paypal.Buttons({
          style: { layout: "vertical", shape: "rect", label: "paypal", height: 44 },
          createOrder: () => {
            const orderId = session.paypalOrderId
            if (!isPayPalProviderOrderId(orderId)) {
              throw new Error("PayPal checkout is missing its provider order. Refresh checkout to recover it.")
            }
            logPayPalLifecycle("create_order", { session, currencyCode, amountMinor })
            return orderId as string
          },
          onClick: (_data, actions) => {
            if (disabled || placing) {
              actions.disable?.()
              return
            }
            actions.enable?.()
          },
          onApprove: async ({ orderID }) => {
            if (orderID && orderID !== session.paypalOrderId) throw new Error("PayPal order does not match this checkout.")
            if (approveInFlightRef.current) return
            approveInFlightRef.current = true
            logPayPalLifecycle("approved", { session, currencyCode, amountMinor })
            try {
              await onApproveRef.current()
              logPayPalLifecycle("complete_cart_succeeded", { session, currencyCode, amountMinor })
            } finally {
              approveInFlightRef.current = false
            }
          },
          onCancel: () => {
            logPayPalLifecycle("cancelled", { session, currencyCode, amountMinor })
            onCancelRef.current?.()
          },
          onError: (reason) => {
            const message = reason instanceof Error ? reason.message : "PayPal payment could not be completed."
            logPayPalLifecycle("error", { session, currencyCode, amountMinor })
            setError(message)
            onErrorRef.current?.(message)
          },
        })
        buttonsRef.current = buttons
        return buttons.render(mount).then(() => {
          logPayPalLifecycle("button_ready", { session, currencyCode, amountMinor })
        })
      })
      .catch((reason) => {
        if (!active) return
        const message = reason instanceof Error ? reason.message : "Unable to load PayPal Sandbox."
        logPayPalLifecycle("sdk_error", { session, currencyCode, amountMinor })
        setError(message)
        onErrorRef.current?.(message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
      buttonsRef.current?.close?.()
      buttonsRef.current = null
      mount?.replaceChildren()
    }
  }, [amountMinor, clientId, currencyCode, disabled, retryVersion, session])

  if (!clientId) return <p className="buyer-checkout-inline-error" role="alert">PayPal Sandbox is not configured.</p>
  if (!session.paypalOrderId) return <p className="buyer-checkout-card-copy">Preparing PayPal…</p>
  return (
    <div className="buyer-checkout-paypal-form">
      {loading ? <Button disabled loading>Loading PayPal…</Button> : null}
      <div ref={mountRef} aria-label="PayPal Sandbox payment" />
      {placing ? <p className="buyer-checkout-card-copy">Confirming PayPal payment…</p> : null}
      {error ? <p className="buyer-checkout-inline-error" role="alert">{error}</p> : null}
      {error ? <button type="button" onClick={() => setRetryVersion((version) => version + 1)}>Retry PayPal</button> : null}
    </div>
  )
}
