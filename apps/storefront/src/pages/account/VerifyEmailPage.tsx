import { useEffect, useReducer, useRef, useState, type FormEvent } from "react"
import { useBuyerAuth } from "../../auth/useBuyerAuth"
import { AccountAuthLayout } from "../../components/account/AccountAuthLayout"
import { AccountAuthRequired } from "../../components/account/AccountAuthRequired"
import { Button } from "../../components/ui/Button"
import { Card } from "../../components/ui/Card"
import { FormField } from "../../components/ui/FormField"
import { ErrorState, LoadingState } from "../../components/ui/States"
import {
  confirmBuyerEmailVerification,
  fetchBuyerEmailVerificationStatus,
  sendBuyerEmailVerification,
} from "../../lib/buyer-api"
import { isBuyerEmailVerified } from "../../lib/buyer-preferences"
import { useBuyerPageSettings } from "../../lib/useBuyerPageSettings"
import { safeReturnTo } from "./account-utils"
import { reduceVerifyEmailUiState } from "./verify-email-state"

const RESEND_COOLDOWN_SECONDS = 60

export function VerifyEmailPage({ cartCount }: { cartCount: number }) {
  const { settings, marketplaceMode } = useBuyerPageSettings()
  const auth = useBuyerAuth()
  const [ui, dispatchUi] = useReducer(reduceVerifyEmailUiState, { code: "" })
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [verified, setVerified] = useState(false)
  const [autoSent, setAutoSent] = useState(false)
  const requestSeq = useRef(0)
  const returnTo = safeReturnTo("/account")

  useEffect(() => {
    if (!auth.customer) return
    if (isBuyerEmailVerified(auth.customer.metadata)) {
      setVerified(true)
      return
    }
    void fetchBuyerEmailVerificationStatus()
      .then((status) => setVerified(status.verified))
      .catch(() => undefined)
  }, [auth.customer])

  useEffect(() => {
    if (!auth.customer || verified || autoSent) return
    setAutoSent(true)
    void sendCode()
  }, [auth.customer, autoSent, verified])

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setTimeout(() => setCooldown((current) => Math.max(0, current - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  const sendCode = async () => {
    const requestId = requestSeq.current + 1
    requestSeq.current = requestId
    setSending(true)
    dispatchUi({ type: "send_start" })
    try {
      const result = await sendBuyerEmailVerification()
      if (requestSeq.current !== requestId) return
      dispatchUi({ type: "send_success", email: result.email ?? auth.customer?.email ?? "your email" })
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch {
      if (requestSeq.current !== requestId) return
      dispatchUi({ type: "send_failure" })
    } finally {
      if (requestSeq.current === requestId) setSending(false)
    }
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!/^\d{6}$/.test(ui.code.trim())) {
      dispatchUi({ type: "verify_validation_error", message: "Enter the 6-digit verification code." })
      return
    }
    const requestId = requestSeq.current + 1
    requestSeq.current = requestId
    setLoading(true)
    dispatchUi({ type: "verify_start" })
    try {
      await confirmBuyerEmailVerification(ui.code.trim())
      await auth.refreshCustomer()
      if (requestSeq.current !== requestId) return
      setVerified(true)
      dispatchUi({ type: "verify_success" })
      window.setTimeout(() => window.location.assign(returnTo), 600)
    } catch {
      if (requestSeq.current !== requestId) return
      dispatchUi({ type: "verify_failure" })
    } finally {
      if (requestSeq.current === requestId) setLoading(false)
    }
  }

  return (
    <AccountAuthLayout settings={settings} cartCount={cartCount} marketplaceMode={marketplaceMode}>
      {auth.isLoading ? (
        <LoadingState label="Loading account..." />
      ) : !auth.customer ? (
        <AccountAuthRequired />
      ) : (
        <Card as="section" className="buyer-auth-card buyer-auth-narrow-card">
          <p className="buyer-account-kicker">Email verification</p>
          <h1>Verify your email</h1>
          <p>Enter the 6-digit code sent to {auth.customer.email ?? "your email"}.</p>
          {verified ? (
            <>
              <p className="buyer-account-success" role="status">Your email is verified.</p>
              <Button href={returnTo}>Continue</Button>
            </>
          ) : (
            <form className="buyer-account-form buyer-auth-mobile-form" onSubmit={(event) => void submit(event)}>
              {ui.error ? <ErrorState className="buyer-account-inline-error" title="Verification failed" message={ui.error} /> : null}
              {ui.message ? <p className="buyer-account-success" role="status">{ui.message}</p> : null}
              <FormField
                label="Verification code"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={ui.code}
                onChange={(event) => dispatchUi({ type: "code_change", value: event.target.value })}
                placeholder="6-digit code"
              />
              <Button type="submit" loading={loading} disabled={sending || ui.code.trim().length !== 6} fullWidth>Verify email</Button>
              <Button type="button" variant="secondary" disabled={sending || loading || cooldown > 0} onClick={() => void sendCode()} fullWidth>
                {cooldown > 0 ? `Resend in ${cooldown}s` : sending ? "Sending..." : "Resend code"}
              </Button>
              <div className="buyer-auth-row">
                <a href="/account/sign-in">Use another account</a>
                <a href="/account/profile">Edit profile</a>
              </div>
            </form>
          )}
        </Card>
      )}
    </AccountAuthLayout>
  )
}
