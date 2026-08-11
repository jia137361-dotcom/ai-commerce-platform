import { useState, type FormEvent } from "react"
import { PasswordField, BUYER_PASSWORD_MIN_LENGTH, isValidAuthEmail } from "../../components/auth/AuthPrimitives"
import { AccountAuthLayout } from "../../components/account/AccountAuthLayout"
import { Button } from "../../components/ui/Button"
import { Card } from "../../components/ui/Card"
import { FormField } from "../../components/ui/FormField"
import { ErrorState } from "../../components/ui/States"
import { confirmBuyerPasswordReset } from "../../lib/buyer-api"
import { useBuyerPageSettings } from "../../lib/useBuyerPageSettings"

export function ResetPasswordPage({ cartCount }: { cartCount: number }) {
  const { settings, marketplaceMode } = useBuyerPageSettings()
  const params = new URLSearchParams(window.location.search)
  const [email, setEmail] = useState(params.get("email") ?? "")
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()
  const [success, setSuccess] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!isValidAuthEmail(email)) return setError("Enter a valid email address.")
    if (!/^\d{6}$/.test(code)) return setError("Enter the 6-digit reset code.")
    if (password.length < BUYER_PASSWORD_MIN_LENGTH) return setError("Password must be at least 8 characters.")
    if (password !== confirmPassword) return setError("Passwords do not match.")
    setLoading(true)
    setError(undefined)
    try {
      await confirmBuyerPasswordReset({ email, code, password })
      setSuccess(true)
    } catch {
      setError("Reset code is invalid or expired. Request a new code and try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AccountAuthLayout settings={settings} cartCount={cartCount} marketplaceMode={marketplaceMode}>
      <Card as="section" className="buyer-auth-card buyer-auth-narrow-card">
        <p className="buyer-account-kicker">Password reset</p>
        <h1>Choose a new password</h1>
        <p>Use the 6-digit code from your email. Codes expire and can be used once.</p>
        {success ? (
          <div className="buyer-account-form buyer-auth-mobile-form">
            <p className="buyer-account-success" role="status">Password reset successfully. Sign in with your new password.</p>
            <Button href="/account/sign-in" fullWidth>Sign in</Button>
          </div>
        ) : (
          <form className="buyer-account-form buyer-auth-mobile-form" onSubmit={(event) => void submit(event)}>
            {error ? <ErrorState className="buyer-account-inline-error" title="Reset failed" message={error} /> : null}
            <FormField label="Email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Enter your email" autoComplete="email" />
            <FormField
              label="Reset code"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit code"
            />
            <PasswordField label="New password" value={password} onChange={setPassword} placeholder="New password" autoComplete="new-password" />
            <PasswordField label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Confirm password" autoComplete="new-password" />
            <Button type="submit" loading={loading} fullWidth>{loading ? "Resetting..." : "Reset password"}</Button>
            <Button href="/account/forgot-password" variant="ghost" fullWidth>Request a new code</Button>
          </form>
        )}
      </Card>
    </AccountAuthLayout>
  )
}
