import { useEffect, useState } from "react"
import {
  CheckoutSuccessSummary,
  type CheckoutSuccessInfo,
} from "../../components/checkout/CheckoutSuccessSummary"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import {
  fetchStoreSettings,
  getBuyerStoreId,
  type BuyerStoreSettings,
} from "../../lib/buyer-api"

type CheckoutSuccessPageProps = {
  cartCount: number
}

const fallbackSettings: BuyerStoreSettings = {
  storeId: "default_store",
  brandName: "Citigoo",
  metadata: {},
}

const successStorageKey = () => `citigoo:${getBuyerStoreId()}:checkout_success`

const readSuccessInfo = (): CheckoutSuccessInfo | null => {
  const params = new URLSearchParams(window.location.search)
  const orderId = params.get("order_id") ?? ""
  const raw = window.sessionStorage.getItem(successStorageKey())
  if (!raw) {
    return orderId ? { orderId } : null
  }

  try {
    const parsed = JSON.parse(raw) as Partial<CheckoutSuccessInfo>
    if (parsed.orderId && (!orderId || parsed.orderId === orderId)) {
      return {
        orderId: parsed.orderId,
        displayId: parsed.displayId,
        email: parsed.email,
        total: parsed.total,
        currencyCode: parsed.currencyCode,
      }
    }
  } catch (error) {
    console.warn("[checkout-success] unable to parse checkout success data", error)
  }

  return orderId ? { orderId } : null
}

export function CheckoutSuccessPage({ cartCount }: CheckoutSuccessPageProps) {
  const [settings, setSettings] = useState<BuyerStoreSettings>(fallbackSettings)
  const [successInfo] = useState(() => readSuccessInfo())

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
    <div className="buyer-checkout-page buyer-checkout-success-page">
      <StoreTopBar settings={settings} cartCount={cartCount} />
      <main className="buyer-checkout-main">
        {successInfo?.orderId ? (
          <CheckoutSuccessSummary info={successInfo} />
        ) : (
          <section className="buyer-checkout-state">
            <strong>No completed order found</strong>
            <p>This page only shows the latest checkout result from a completed cart.</p>
            <div>
              <a href="/store">Continue shopping</a>
              <a href="/cart">Back to cart</a>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
