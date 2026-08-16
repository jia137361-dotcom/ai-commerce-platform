import { useEffect, useRef, useState } from "react"
import { Button } from "../ui/Button"

type PayPalVaultNamespace = {
  Buttons: (options: {
    style?: Record<string, unknown>
    onClick?: () => void
    createVaultSetupToken: () => Promise<string> | string
    onApprove: (data: { vaultSetupToken?: string }) => Promise<void> | void
    onCancel?: () => void
    onError?: (error: unknown) => void
  }) => { render: (element: HTMLElement) => Promise<void>; close?: () => void }
}

const paypalVaultSdkPromises = new Map<string, Promise<PayPalVaultNamespace>>()

const vaultSdkKey = (clientId: string, merchantId: string, userIdToken: string) =>
  `${clientId}:${merchantId}:${userIdToken.slice(0, 16)}`

const loadPayPalVaultSdk = (clientId: string, merchantId: string, userIdToken: string) => {
  if (typeof window === "undefined") return Promise.reject(new Error("PayPal is only available in a browser."))
  const key = vaultSdkKey(clientId, merchantId, userIdToken)
  const cached = paypalVaultSdkPromises.get(key)
  if (cached) return cached
  const current = window as unknown as { paypal?: PayPalVaultNamespace }
  const configuredScript = document.querySelector<HTMLScriptElement>("script[data-paypal-vault-sdk]")
  if (current.paypal && configuredScript?.dataset.paypalVaultSdk === key) return Promise.resolve(current.paypal)
  if (current.paypal) {
    document.querySelectorAll<HTMLScriptElement>('script[src*="paypal.com/sdk/js"]').forEach((script) => script.remove())
    delete current.paypal
  }
  const promise = new Promise<PayPalVaultNamespace>((resolve, reject) => {
    const script = document.createElement("script")
    const params = new URLSearchParams({
      "client-id": clientId,
      components: "buttons",
      intent: "tokenize",
      vault: "true",
    })
    if (merchantId) params.set("merchant-id", merchantId)
    script.src = `https://www.paypal.com/sdk/js?${params.toString()}`
    script.async = true
    script.dataset.paypalVaultSdk = key
    script.setAttribute("data-user-id-token", userIdToken)
    script.onload = () => current.paypal ? resolve(current.paypal) : reject(new Error("PayPal loaded without Vault buttons."))
    script.onerror = () => reject(new Error("Unable to load PayPal authorization."))
    document.head.appendChild(script)
  })
  paypalVaultSdkPromises.set(key, promise)
  void promise.catch(() => {
    if (paypalVaultSdkPromises.get(key) === promise) paypalVaultSdkPromises.delete(key)
  })
  return promise
}

export function PayPalVaultSetupForm({
  clientId,
  merchantId,
  userIdToken,
  setupTokenId,
  approvalUrl,
  onComplete,
  onCancel,
}: {
  clientId: string
  merchantId: string
  userIdToken: string
  setupTokenId: string
  approvalUrl: string
  onComplete: (setupTokenId: string) => Promise<void>
  onCancel: () => void
}) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const buttonsRef = useRef<{ close?: () => void } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [status, setStatus] = useState<string>()

  useEffect(() => {
    let active = true
    const mount = mountRef.current
    if (!mount) return
    void loadPayPalVaultSdk(clientId, merchantId, userIdToken)
      .then((paypal) => {
        if (!active) return
        const buttons = paypal.Buttons({
          style: { layout: "vertical", shape: "rect", label: "paypal", height: 44 },
          onClick: () => {
            if (!active) return
            setStatus("PayPal button clicked. Opening authorization...")
            console.info("[paypal-vault] onClick", { setupTokenId })
          },
          createVaultSetupToken: async () => {
            if (active) {
              setStatus("PayPal setup token sent. Waiting for PayPal authorization...")
              console.info("[paypal-vault] createVaultSetupToken", { setupTokenId })
            }
            return setupTokenId
          },
          onApprove: async ({ vaultSetupToken }) => {
            if (active) {
              setStatus("PayPal approved. Saving account...")
              console.info("[paypal-vault] onApprove", { vaultSetupToken })
            }
            if (!vaultSetupToken || vaultSetupToken !== setupTokenId) {
              throw new Error("PayPal authorization token did not match this request.")
            }
            await onComplete(vaultSetupToken)
          },
          onCancel: () => {
            if (active) {
              setStatus("PayPal authorization was canceled.")
              console.info("[paypal-vault] onCancel")
            }
            onCancel()
          },
          onError: (reason) => {
            if (!active) return
            console.error("[paypal-vault] onError", reason)
            setError(reason instanceof Error ? reason.message : "PayPal authorization could not be completed.")
          },
        })
        buttonsRef.current = buttons
        return buttons.render(mount)
      })
      .catch((reason) => {
        if (!active) return
        setError(reason instanceof Error ? reason.message : "Unable to load PayPal authorization.")
      })
      .finally(() => { if (active) setLoading(false) })
    return () => {
      active = false
      buttonsRef.current?.close?.()
      buttonsRef.current = null
      mount.replaceChildren()
    }
  }, [clientId, merchantId, onCancel, onComplete, setupTokenId, userIdToken])

  return (
    <div className="buyer-payment-method-setup">
      <h2>Authorize PayPal</h2>
      <p>PayPal will ask you to approve future purchases. CiiVerse never receives your PayPal password.</p>
      <p className="buyer-account-setting-note">
        PayPal vault debug: sdk ready for setup token {setupTokenId.slice(0, 6)}...
      </p>
      {loading ? <Button disabled loading>Loading PayPal...</Button> : null}
      <div ref={mountRef} aria-label="Authorize PayPal account" />
      {approvalUrl ? (
        <Button
          variant="secondary"
          onClick={() => {
            window.sessionStorage.setItem("citigoo:paypal_vault_setup_token", setupTokenId)
            window.location.assign(approvalUrl)
          }}
        >
          Open PayPal authorization
        </Button>
      ) : null}
      {status ? <p className="buyer-account-setting-note" role="status">{status}</p> : null}
      {error ? <p className="buyer-account-error" role="alert">{error}</p> : null}
      <Button variant="ghost" onClick={onCancel}>Cancel</Button>
    </div>
  )
}
