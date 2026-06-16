import { useEffect, useState } from "react"
import { AccountAuthLayout } from "../../components/account/AccountAuthLayout"
import { AccountNavigation } from "../../components/account/AccountNavigation"
import { AccountAuthRequired } from "../../components/account/AccountAuthRequired"
import { fetchStoreSettings, type BuyerStoreSettings } from "../../lib/buyer-api"
import { useBuyerAuth } from "../../auth/useBuyerAuth"

const fallbackSettings: BuyerStoreSettings = { storeId: "default_store", brandName: "Citigoo", metadata: {} }

export function AccountHomePage({ cartCount }: { cartCount: number }) {
  const [settings, setSettings] = useState(fallbackSettings)
  const auth = useBuyerAuth()

  useEffect(() => {
    void fetchStoreSettings().then((result) => setSettings(result.data))
  }, [])

  return (
    <AccountAuthLayout settings={settings} cartCount={cartCount}>
      {auth.isLoading ? (
        <section className="buyer-account-card buyer-account-required">Loading account...</section>
      ) : !auth.customer ? (
        <AccountAuthRequired />
      ) : (
        <section className="buyer-account-layout">
          <AccountNavigation customer={auth.customer} onSignOut={() => void auth.signOut().then(() => window.location.assign("/store"))} />
          <div className="buyer-account-card buyer-account-overview">
            <p className="buyer-account-kicker">Overview</p>
            <h1>Welcome back</h1>
            <p>Your secure buyer session is active. Authenticated order history will be added in the next order-list batch.</p>
            <div>
              <a href="/account/profile">Edit profile</a>
              <a href="/account/orders">Orders</a>
            </div>
          </div>
        </section>
      )}
    </AccountAuthLayout>
  )
}
