import { useEffect, useState } from "react"
import { OrderLookupForm } from "../../components/orders/OrderLookupForm"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import {
  fetchStoreSettings,
  lookupOrder,
  type BuyerStoreSettings,
} from "../../lib/buyer-api"

type OrderLookupPageProps = {
  cartCount: number
}

const fallbackSettings: BuyerStoreSettings = {
  storeId: "default_store",
  brandName: "Citigoo",
  metadata: {},
}

export function OrderLookupPage({ cartCount }: OrderLookupPageProps) {
  const [settings, setSettings] = useState<BuyerStoreSettings>(fallbackSettings)
  const [email, setEmail] = useState("")
  const [displayId, setDisplayId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()

  useEffect(() => {
    let active = true
    void fetchStoreSettings().then((result) => {
      if (active) setSettings(result.data)
    })
    return () => {
      active = false
    }
  }, [])

  const handleSubmit = async () => {
    setError(undefined)
    if (!email.includes("@")) {
      setError("Enter the email used at checkout.")
      return
    }
    if (!displayId.trim() || Number.isNaN(Number(displayId))) {
      setError("Enter a numeric order display id.")
      return
    }

    setLoading(true)
    try {
      const order = await lookupOrder(email, displayId)
      if (!order.orderId) {
        throw new Error("Order lookup succeeded without an order_id.")
      }
      const params = new URLSearchParams({ email: email.trim().toLowerCase() })
      if (order.displayId) params.set("display_id", order.displayId)
      window.location.assign(`/account/orders/${encodeURIComponent(order.orderId)}?${params.toString()}`)
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : "Unable to find that order.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="buyer-orders-page">
      <StoreTopBar settings={settings} cartCount={cartCount} />
      <main className="buyer-orders-main buyer-order-lookup-main">
        <OrderLookupForm
          email={email}
          displayId={displayId}
          loading={loading}
          error={error}
          onEmailChange={setEmail}
          onDisplayIdChange={setDisplayId}
          onSubmit={handleSubmit}
        />
      </main>
    </div>
  )
}
