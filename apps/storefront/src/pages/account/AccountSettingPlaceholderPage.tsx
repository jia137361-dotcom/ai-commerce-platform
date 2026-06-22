import { useEffect, useState } from "react"
import { useBuyerAuth } from "../../auth/useBuyerAuth"
import { AccountAuthLayout } from "../../components/account/AccountAuthLayout"
import { AccountAuthRequired } from "../../components/account/AccountAuthRequired"
import { AccountNavigation } from "../../components/account/AccountNavigation"
import { AccountSettingPlaceholderContent } from "../../components/account/AccountSettingPlaceholderContent"
import { AccountSecurityContent } from "../../components/account/AccountSecurityContent"
import { LoadingState } from "../../components/ui/States"
import { fetchStoreSettings, type BuyerStoreSettings } from "../../lib/buyer-api"
import type { AccountSettingPlaceholder } from "./account-setting-placeholders"

const fallbackSettings: BuyerStoreSettings = { storeId: "default_store", brandName: "Citigoo", metadata: {} }

export function AccountSettingPlaceholderPage({ cartCount, setting }: { cartCount: number; setting: AccountSettingPlaceholder }) {
  const auth = useBuyerAuth()
  const [settings, setSettings] = useState(fallbackSettings)

  useEffect(() => {
    void fetchStoreSettings().then((result) => setSettings(result.data))
  }, [])

  return (
    <AccountAuthLayout settings={settings} cartCount={cartCount}>
      {auth.isLoading ? <LoadingState label={`Loading ${setting.title.toLowerCase()}...`} /> : !auth.customer ? <AccountAuthRequired /> : (
        <section className="buyer-account-layout">
          <AccountNavigation
            customer={auth.customer}
            onSignOut={() => void auth.signOut().then(() => window.location.assign("/store"))}
            onSwitchAccount={() => void auth.signOut().then(() => window.location.assign("/account/sign-in"))}
          />
          {setting.slug === "security" ? <AccountSecurityContent customer={auth.customer} /> : <AccountSettingPlaceholderContent setting={setting} />}
        </section>
      )}
    </AccountAuthLayout>
  )
}
