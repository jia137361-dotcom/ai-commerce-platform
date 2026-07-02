import { useEffect, useState } from "react"
import { AccountAuthLayout } from "../../components/account/AccountAuthLayout"
import { SignInForm } from "../../components/account/SignInForm"
import { fetchStoreSettings, type BuyerStoreSettings } from "../../lib/buyer-api"
import { useBuyerAuth } from "../../auth/useBuyerAuth"
import { safeReturnTo } from "./account-utils"
import { Card } from "../../components/ui/Card"

const fallbackSettings: BuyerStoreSettings = { storeId: "default_store", brandName: "Citigoo", metadata: {} }

export function SignInPage({ cartCount }: { cartCount: number }) {
  const [settings, setSettings] = useState(fallbackSettings)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const auth = useBuyerAuth()

  useEffect(() => {
    void fetchStoreSettings().then((result) => setSettings(result.data))
  }, [])

  const submit = async (email: string, password: string) => {
    setLoading(true)
    setError(undefined)
    try {
      await auth.signIn({ email, password })
      window.location.assign(safeReturnTo())
    } catch {
      setError("Unable to sign in with those credentials.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AccountAuthLayout settings={settings} cartCount={cartCount}>
      <div className="buyer-account-auth-shell">
        <section className="buyer-account-auth-intro">
          <p>Buyer account</p>
          <h1>Welcome back</h1>
          <span>Sign in to view your orders and profile. This session is separate from seller dashboard access.</span>
        </section>
        <Card as="section" className="buyer-account-auth-card">
        <div className="buyer-account-auth-tabs">
          <a className="active" href="/account/sign-in">Sign in</a>
          <a href="/account/register">Sign up</a>
        </div>
        <SignInForm loading={loading} error={error} onSubmit={submit} />
        </Card>
      </div>
    </AccountAuthLayout>
  )
}
