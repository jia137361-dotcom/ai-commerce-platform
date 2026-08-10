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

  const submit = async (input: {
    email: string
    code: string
    password: string
    rememberMe: boolean
  }) => {
    setLoading(true)
    setError(undefined)
    try {
      await auth.register({
        email: input.email,
        code: input.code,
        password: input.password,
        rememberMe: input.rememberMe,
        acceptedTerms: true,
      })
      window.location.assign(safeReturnTo("/account"))
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
          <span>Verify your Gmail or Apple email with a code, then create a password for next time.</span>
        </section>
        <Card as="section" className="buyer-account-auth-card">
          <div className="buyer-account-auth-tabs">
            <a href="/account/sign-in">Sign in</a>
            <a className="active" href="/account/register">
              Sign up
            </a>
          </div>
          <RegisterForm loading={loading} error={error} onSubmit={submit} />
        </Card>
      </div>
    </AccountAuthLayout>
  )
}
