import { useEffect, useState } from "react"
import { AccountAuthLayout } from "../../components/account/AccountAuthLayout"
import { AccountNavigation } from "../../components/account/AccountNavigation"
import { AccountAuthRequired } from "../../components/account/AccountAuthRequired"
import { fetchStoreSettings, type BuyerStoreSettings } from "../../lib/buyer-api"
import { useBuyerAuth } from "../../auth/useBuyerAuth"
import { Button } from "../../components/ui/Button"
import { Card } from "../../components/ui/Card"
import { LoadingState } from "../../components/ui/States"

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
        <LoadingState label="Loading buyer account..." />
      ) : !auth.customer ? (
        <AccountAuthRequired />
      ) : (
        <section className="buyer-account-layout">
          <AccountNavigation
            customer={auth.customer}
            onSignOut={() => void auth.signOut().then(() => window.location.assign("/store"))}
            onSwitchAccount={() => void auth.signOut().then(() => window.location.assign("/account/sign-in"))}
          />
          <div className="buyer-account-content">
            <Card as="section" className="buyer-account-overview">
              <p className="buyer-account-kicker">Buyer account</p>
              <h1>Welcome back</h1>
              <p>You are signed in as <strong>{auth.customer.email || "a buyer account"}</strong>. Your cart stays available if you sign out or switch accounts.</p>
              <div className="buyer-account-actions">
                <Button href="/account/orders">View orders</Button>
                <Button href="/account/profile" variant="secondary">View profile</Button>
              </div>
            </Card>
            <Card as="section" variant="muted" className="buyer-account-session-card">
              <h2>Account session</h2>
              <p>Switching accounts signs out this buyer session only. Seller dashboard access and your shopping cart are not affected.</p>
              <div className="buyer-account-actions">
                <Button variant="secondary" onClick={() => void auth.signOut().then(() => window.location.assign("/account/sign-in"))}>Switch account</Button>
                <Button variant="ghost" onClick={() => void auth.signOut().then(() => window.location.assign("/store"))}>Sign out</Button>
              </div>
            </Card>
          </div>
        </section>
      )}
    </AccountAuthLayout>
  )
}
