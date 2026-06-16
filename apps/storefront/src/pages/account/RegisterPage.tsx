import { useEffect, useState } from "react"
import { AccountAuthLayout } from "../../components/account/AccountAuthLayout"
import { RegisterForm } from "../../components/account/RegisterForm"
import { fetchStoreSettings, type BuyerStoreSettings } from "../../lib/buyer-api"
import { useBuyerAuth } from "../../auth/useBuyerAuth"
import { safeReturnTo } from "./account-utils"

const fallbackSettings: BuyerStoreSettings = { storeId: "default_store", brandName: "Citigoo", metadata: {} }

export function RegisterPage({ cartCount }: { cartCount: number }) {
  const [settings, setSettings] = useState(fallbackSettings)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const auth = useBuyerAuth()

  useEffect(() => {
    void fetchStoreSettings().then((result) => setSettings(result.data))
  }, [])

  const submit = async (input: { email: string; password: string; firstName?: string; lastName?: string; phone?: string }) => {
    setLoading(true)
    setError(undefined)
    try {
      await auth.register(input)
      window.location.assign(safeReturnTo())
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : "Unable to create account.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AccountAuthLayout settings={settings} cartCount={cartCount}>
      <section className="buyer-account-auth-card">
        <div className="buyer-account-auth-tabs">
          <a href="/account/sign-in">Sign in</a>
          <a className="active" href="/account/register">Sign up</a>
        </div>
        <RegisterForm loading={loading} error={error} onSubmit={submit} />
      </section>
    </AccountAuthLayout>
  )
}
