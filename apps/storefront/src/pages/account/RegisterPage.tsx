import { useState } from "react"
import { AccountAuthLayout } from "../../components/account/AccountAuthLayout"
import { RegisterForm } from "../../components/account/RegisterForm"
import { useBuyerAuth } from "../../auth/useBuyerAuth"
import { useBuyerPageSettings } from "../../lib/useBuyerPageSettings"
import { safeReturnTo } from "./account-utils"
import { Card } from "../../components/ui/Card"

export function RegisterPage({ cartCount }: { cartCount: number }) {
  const { settings, marketplaceMode } = useBuyerPageSettings()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const auth = useBuyerAuth()

  const submit = async (input: { email: string; password: string }) => {
    setLoading(true)
    setError(undefined)
    try {
      await auth.register(input)
      const returnTo = safeReturnTo("/account")
      window.location.assign(`/account/verify-email?returnTo=${encodeURIComponent(returnTo)}`)
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : "Unable to create account.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AccountAuthLayout settings={settings} cartCount={cartCount} marketplaceMode={marketplaceMode}>
      <div className="buyer-account-auth-shell">
        <section className="buyer-account-auth-intro">
          <p>Buyer account</p>
          <h1>Create your account</h1>
          <span>Register with email and password. Add your name and phone later from Profile.</span>
        </section>
        <Card as="section" className="buyer-account-auth-card">
        <div className="buyer-account-auth-tabs">
          <a href="/account/sign-in">Sign in</a>
          <a className="active" href="/account/register">Sign up</a>
        </div>
        <RegisterForm loading={loading} error={error} onSubmit={submit} />
        </Card>
      </div>
    </AccountAuthLayout>
  )
}
