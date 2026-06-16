import { useEffect, useState } from "react"
import { OrderHistoryAuthRequired } from "../../components/orders/OrderHistoryAuthRequired"
import { OrderHistoryHeader } from "../../components/orders/OrderHistoryHeader"
import { OrderHistoryTabs } from "../../components/orders/OrderHistoryTabs"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
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
        <OrderHistoryAuthRequired />
      </main>
    </div>
  )
}
