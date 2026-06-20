import { useEffect, useState } from "react"
import { AccountAuthLayout } from "../../components/account/AccountAuthLayout"
import { AccountAuthRequired } from "../../components/account/AccountAuthRequired"
import { AccountNavigation } from "../../components/account/AccountNavigation"
import { AccountProfileForm } from "../../components/account/AccountProfileForm"
import { useBuyerAuth } from "../../auth/useBuyerAuth"
import { fetchStoreSettings, type BuyerStoreSettings } from "../../lib/buyer-api"

const fallbackSettings: BuyerStoreSettings = { storeId: "default_store", brandName: "Citigoo", metadata: {} }

export function AccountProfilePage({ cartCount }: { cartCount: number }) {
  const [settings, setSettings] = useState(fallbackSettings)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const auth = useBuyerAuth()

  useEffect(() => {
    void fetchStoreSettings().then((result) => setSettings(result.data))
  }, [])

  const submit = async (input: { firstName?: string; lastName?: string; phone?: string }) => {
    setSaving(true)
    setSaved(false)
    setError(undefined)
    try {
      await auth.updateProfile(input)
      setSaved(true)
    } catch (profileError) {
      setError(profileError instanceof Error ? profileError.message : "Unable to save profile.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <AccountAuthLayout settings={settings} cartCount={cartCount}>
      {auth.isLoading ? (
        <section className="buyer-account-card buyer-account-required">Loading account...</section>
      ) : !auth.customer ? (
        <AccountAuthRequired />
      ) : (
        <section className="buyer-account-layout">
          <AccountNavigation
            customer={auth.customer}
            onSignOut={() => void auth.signOut().then(() => window.location.assign("/store"))}
            onSwitchAccount={() => void auth.signOut().then(() => window.location.assign("/account/sign-in"))}
          />
          <AccountProfileForm customer={auth.customer} loading={saving} saved={saved} error={error} onSubmit={submit} />
        </section>
      )}
    </AccountAuthLayout>
  )
}
