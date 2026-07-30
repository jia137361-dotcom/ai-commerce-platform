import { useState, type FormEvent } from "react"
import { AccountAuthLayout } from "../../components/account/AccountAuthLayout"
import { Button } from "../../components/ui/Button"
import { Card } from "../../components/ui/Card"
import { FormField } from "../../components/ui/FormField"
import { ErrorState } from "../../components/ui/States"
import { requestBuyerPasswordReset } from "../../lib/buyer-api"
import { useBuyerPageSettings } from "../../lib/useBuyerPageSettings"
import { isValidAuthEmail } from "../../components/auth/AuthPrimitives"

export function ForgotPasswordPage({ cartCount }: { cartCount: number }) {
  const { settings, marketplaceMode } = useBuyerPageSettings()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()
  const [sent, setSent] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!isValidAuthEmail(email)) {
      setError("Enter a valid email address.")
      return
    }
    setLoading(true)
    setError(undefined)
    try {
      await requestBuyerPasswordReset({ email })
      setSent(true)
    } catch {
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AccountAuthLayout settings={settings} cartCount={cartCount} marketplaceMode={marketplaceMode}>
      <Card as="section" className="buyer-auth-card buyer-auth-narrow-card">
        <p className="buyer-account-kicker">Password help</p>
        <h1>Reset your password</h1>
        <p>Enter your email and we'll send a reset code if the account exists.</p>
        {sent ? (
          <div className="buyer-account-form buyer-auth-mobile-form">
            <p className="buyer-account-success" role="status">If an account exists for that email, a reset code has been sent.</p>
            <Button href={`/account/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}`} fullWidth>Enter reset code</Button>
            <Button href="/account/sign-in" variant="secondary" fullWidth>Back to sign in</Button>
          </div>
        ) : (
          <form className="buyer-account-form buyer-auth-mobile-form" onSubmit={(event) => void submit(event)}>
            {error ? <ErrorState className="buyer-account-inline-error" title="Check email" message={error} /> : null}
            <FormField label="Email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Enter your email" autoComplete="email" />
            <Button type="submit" loading={loading} fullWidth>{loading ? "Sending..." : "Send reset code"}</Button>
            <Button href="/account/sign-in" variant="ghost" fullWidth>Back to sign in</Button>
          </form>
        )}
      </Card>
    </AccountAuthLayout>
  )
}
