import { useEffect, useState } from "react"
import { OrderHistoryAuthRequired } from "../../components/orders/OrderHistoryAuthRequired"
import { OrderHistoryHeader } from "../../components/orders/OrderHistoryHeader"
import { OrderHistoryTabs } from "../../components/orders/OrderHistoryTabs"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import { useBuyerAuth } from "../../auth/useBuyerAuth"
import { fetchStoreSettings, type BuyerStoreSettings } from "../../lib/buyer-api"

type OrderHistoryPageProps = {
  cartCount: number
}

const fallbackSettings: BuyerStoreSettings = {
  storeId: "default_store",
  brandName: "Citigoo",
  metadata: {},
}

export function OrderHistoryPage({ cartCount }: OrderHistoryPageProps) {
  const [settings, setSettings] = useState<BuyerStoreSettings>(fallbackSettings)
  const auth = useBuyerAuth()

  useEffect(() => {
    let active = true
    void fetchStoreSettings().then((result) => {
      if (active) setSettings(result.data)
    })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="buyer-orders-page">
      <StoreTopBar settings={settings} cartCount={cartCount} />
      <main className="buyer-orders-main buyer-order-history-main">
        <OrderHistoryHeader />
        <OrderHistoryTabs />
        {auth.isLoading ? (
          <section className="buyer-order-history-auth-card" role="status">Checking account session...</section>
        ) : auth.customer ? (
          <section className="buyer-order-history-auth-card">
            <span className="buyer-order-history-lock" aria-hidden="true">✓</span>
            <h2>Order history is ready for secure API integration</h2>
            <p>
              You are signed in as {auth.customer.email}. The authenticated order-list endpoint will be added in the next batch, so this page does not request or mock order cards yet.
            </p>
            <div className="buyer-order-history-actions">
              <a href="/orders/lookup">Find a guest order</a>
              <a href="/store">Back to store</a>
            </div>
          </section>
        ) : (
          <OrderHistoryAuthRequired />
        )}
      </main>
    </div>
  )
}
