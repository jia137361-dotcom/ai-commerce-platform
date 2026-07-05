import { useState } from "react"
import { AccountAuthLayout } from "../../components/account/AccountAuthLayout"
import { AccountAuthRequired } from "../../components/account/AccountAuthRequired"
import { AccountNavigation } from "../../components/account/AccountNavigation"
import { AccountProfileForm } from "../../components/account/AccountProfileForm"
import { useBuyerAuth } from "../../auth/useBuyerAuth"
import { useBuyerPageSettings } from "../../lib/useBuyerPageSettings"
import { LoadingState } from "../../components/ui/States"

export function AccountProfilePage({ cartCount }: { cartCount: number }) {
  const { settings, marketplaceMode } = useBuyerPageSettings({ marketplace: true })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const auth = useBuyerAuth()

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
    <AccountAuthLayout settings={settings} cartCount={cartCount} marketplaceMode={marketplaceMode}>
      {auth.isLoading ? (
        <LoadingState label="Loading buyer profile..." />
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
