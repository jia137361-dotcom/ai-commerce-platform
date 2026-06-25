import { FormEvent, useEffect, useState } from "react"
import {
  changeBuyerPassword,
  confirmBuyerEmailVerification,
  fetchBuyerEmailVerificationStatus,
  sendBuyerEmailVerification,
  type BuyerCustomer,
} from "../../lib/buyer-api"
import { isBuyerEmailVerified } from "../../lib/buyer-preferences"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import { FormField } from "../ui/FormField"

type AccountSecurityContentProps = {
  customer: BuyerCustomer
  onCustomerUpdated?: () => void
}

export function AccountSecurityContent({ customer, onCustomerUpdated }: AccountSecurityContentProps) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string>()
  const [verificationCode, setVerificationCode] = useState("")
  const [verificationMessage, setVerificationMessage] = useState<string>()
  const [verificationLoading, setVerificationLoading] = useState(false)
  const [verified, setVerified] = useState(isBuyerEmailVerified(customer.metadata))
  const [devCodeHint, setDevCodeHint] = useState<string>()

  useEffect(() => {
    setVerified(isBuyerEmailVerified(customer.metadata))
  }, [customer.metadata])

  useEffect(() => {
    void fetchBuyerEmailVerificationStatus()
      .then((status) => setVerified(status.verified))
      .catch(() => undefined)
  }, [customer.id])

  const submitPassword = async (event: FormEvent) => {
    event.preventDefault()
    if (newPassword !== confirmPassword) return setMessage("New passwords do not match.")
    setSaving(true)
    setMessage(undefined)
    try {
      await changeBuyerPassword(currentPassword, newPassword)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setMessage("Password changed successfully.")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to change password")
    } finally {
      setSaving(false)
    }
  }

  const sendVerification = async () => {
    setVerificationLoading(true)
    setVerificationMessage(undefined)
    setDevCodeHint(undefined)
    try {
      const result = await sendBuyerEmailVerification()
      setVerificationMessage(`Verification code sent to ${result.email ?? customer.email}.`)
      if (result.dev_code) setDevCodeHint(`Local dev code: ${result.dev_code}`)
    } catch (error) {
      setVerificationMessage(error instanceof Error ? error.message : "Unable to send verification code.")
    } finally {
      setVerificationLoading(false)
    }
  }

  const confirmVerification = async (event: FormEvent) => {
    event.preventDefault()
    setVerificationLoading(true)
    setVerificationMessage(undefined)
    try {
      await confirmBuyerEmailVerification(verificationCode.trim())
      setVerified(true)
      setVerificationCode("")
      setVerificationMessage("Email verified successfully.")
      onCustomerUpdated?.()
    } catch (error) {
      setVerificationMessage(error instanceof Error ? error.message : "Unable to verify email.")
    } finally {
      setVerificationLoading(false)
    }
  }

  return (
    <Card as="section" className="buyer-account-setting-placeholder">
      <div className="buyer-account-setting-heading">
        <div>
          <p className="buyer-account-kicker">Account setting</p>
          <h1>Account &amp; Security</h1>
        </div>
      </div>

      <Card variant="outlined" className="buyer-account-setting-state">
        <h2>Sign-in identity</h2>
        <p>{customer.email}</p>
        <p>{verified ? "Email verified" : "Email not verified yet"}</p>
      </Card>

      <section className="buyer-account-form">
        <h2>Verify email</h2>
        <p className="buyer-account-setting-note">
          Confirm that this account email is real before placing orders. Phone verification can be added later.
        </p>
        {verified ? (
          <p role="status">Your email is verified for this account.</p>
        ) : (
          <>
            <Button type="button" loading={verificationLoading} onClick={() => void sendVerification()}>
              Send verification code
            </Button>
            {devCodeHint ? <p className="buyer-account-setting-note">{devCodeHint}</p> : null}
            <form onSubmit={(event) => void confirmVerification(event)}>
              <FormField
                label="Verification code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value)}
                placeholder="6-digit code"
              />
              <Button type="submit" disabled={verificationLoading || verificationCode.trim().length !== 6}>
                Confirm email
              </Button>
            </form>
          </>
        )}
        {verificationMessage ? <p role="status">{verificationMessage}</p> : null}
      </section>

      <form onSubmit={(event) => void submitPassword(event)} className="buyer-account-form">
        <h2>Change password</h2>
        <label>Current password<input type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
        <label>New password<input type="password" autoComplete="new-password" minLength={8} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
        <label>Confirm new password<input type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
        <Button type="submit" disabled={saving}>{saving ? "Changing…" : "Change password"}</Button>
        {message ? <p role="status">{message}</p> : null}
      </form>
    </Card>
  )
}
