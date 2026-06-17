import { useEffect, useState } from "react"
import {
  CheckoutSuccessSummary,
  type CheckoutSuccessInfo,
} from "../../components/checkout/CheckoutSuccessSummary"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import { useBuyerAuth } from "../../auth/useBuyerAuth"
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
    const parsed = JSON.parse(raw) as Partial<CheckoutSuccessInfo> & {
      order_id?: string
      display_id?: string
      currency_code?: string
    }
    const storedOrderId = parsed.orderId ?? parsed.order_id
    if (storedOrderId && (!orderId || storedOrderId === orderId)) {
      return {
        orderId: storedOrderId,
        displayId: parsed.displayId ?? parsed.display_id,
        email: parsed.email,
        total: parsed.total,
        currencyCode: parsed.currencyCode ?? parsed.currency_code,
      }
    }
  } catch (error) {
    console.warn("[checkout-success] unable to parse checkout success data", error)
  }

  return orderId ? { orderId } : null
}

export function CheckoutSuccessPage({ cartCount }: CheckoutSuccessPageProps) {
  const auth = useBuyerAuth()
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
          <CheckoutSuccessSummary info={successInfo} isAuthenticated={Boolean(auth.customer)} />
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
