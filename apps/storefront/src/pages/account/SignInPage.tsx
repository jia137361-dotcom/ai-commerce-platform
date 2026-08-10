import { useState } from "react"
import { AccountAuthLayout } from "../../components/account/AccountAuthLayout"
import { SignInForm } from "../../components/account/SignInForm"
import { useBuyerAuth } from "../../auth/useBuyerAuth"
import { useBuyerPageSettings } from "../../lib/useBuyerPageSettings"
import { safeReturnTo } from "./account-utils"
import { Card } from "../../components/ui/Card"
import { isBuyerEmailVerified } from "../../lib/buyer-preferences"

export function SignInPage({ cartCount }: { cartCount: number }) {
  const { settings, marketplaceMode } = useBuyerPageSettings()
  const params = new URLSearchParams(window.location.search)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>(
    params.get("expired") === "1" ? "Your session expired. Sign in again to continue." : undefined
  )
  const auth = useBuyerAuth()

  const submit = async (input: { email: string; code?: string; password?: string; rememberMe: boolean }) => {
    setLoading(true)
    setError(undefined)
    try {
      const customer = await auth.signIn({
        email: input.email,
        code: input.code,
        password: input.password,
        rememberMe: input.rememberMe,
      })
      const returnTo = safeReturnTo()
      if (!isBuyerEmailVerified(customer.metadata)) {
        window.location.assign(`/account/verify-email?returnTo=${encodeURIComponent(returnTo)}`)
        return
      }
      window.location.assign(returnTo)
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : "Unable to sign in with those credentials.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AccountAuthLayout settings={settings} cartCount={cartCount} marketplaceMode={marketplaceMode}>
      <div className="buyer-account-auth-shell">
        <section className="buyer-account-auth-intro">
          <p>Buyer account</p>
          <h1>Welcome back</h1>
          <span>Sign in with your password or an email code. Keep me signed in stays active on this device.</span>
        </section>
        <Card as="section" className="buyer-account-auth-card">
          <div className="buyer-account-auth-tabs">
            <a className="active" href="/account/sign-in">
              Sign in
            </a>
            <a href="/account/register">Sign up</a>
          </div>
          <SignInForm loading={loading} error={error} onSubmit={submit} />
        </Card>
      </div>
    </AccountAuthLayout>
  )
}
