import { useEffect, useState } from "react"
import { OrderTrackingEmptyState } from "../../components/orders/OrderTrackingEmptyState"
import { OrderTrackingHeader } from "../../components/orders/OrderTrackingHeader"
import { OrderTrackingShipment } from "../../components/orders/OrderTrackingShipment"
import { OrderTrackingTimeline } from "../../components/orders/OrderTrackingTimeline"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import {
  fetchStoreSettings,
  getBuyerStoreId,
  getOrderTracking,
  type BuyerOrderTracking,
  type BuyerStoreSettings,
} from "../../lib/buyer-api"

type OrderTrackingPageProps = {
  orderId: string
  cartCount: number
}

const fallbackSettings: BuyerStoreSettings = {
  storeId: "default_store",
  brandName: "Citigoo",
  metadata: {},
}

const checkoutSuccessKey = () => `citigoo:${getBuyerStoreId()}:checkout_success`

const readSessionEmail = (orderId: string) => {
  const raw = window.sessionStorage.getItem(checkoutSuccessKey())
  if (!raw) return undefined
  try {
    const parsed = JSON.parse(raw) as { orderId?: string; order_id?: string; email?: string | null }
    const storedOrderId = parsed.orderId ?? parsed.order_id
    if (storedOrderId === orderId && parsed.email) return parsed.email
  } catch (error) {
    console.warn("[order-tracking] unable to parse checkout success data", error)
  }
  return undefined
}

export function OrderTrackingPage({ orderId, cartCount }: OrderTrackingPageProps) {
  const [settings, setSettings] = useState<BuyerStoreSettings>(fallbackSettings)
  const [tracking, setTracking] = useState<BuyerOrderTracking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | undefined>()

  const params = new URLSearchParams(window.location.search)
  const email = params.get("email")?.trim() || readSessionEmail(orderId)
  const displayId = params.get("display_id") ?? undefined

  useEffect(() => {
    let active = true
    void fetchStoreSettings().then((result) => {
      if (active) setSettings(result.data)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      setError(undefined)
      if (!email) {
        setTracking(null)
        setError("Tracking requires the email associated with the order.")
        setLoading(false)
        return
      }
      try {
        const result = await getOrderTracking(orderId, email)
        if (!active) return
        setTracking(result)
      } catch (trackingError) {
        if (!active) return
        setTracking(null)
        setError(trackingError instanceof Error ? trackingError.message : "Unable to load order tracking.")
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [email, orderId])

  const firstShipment = tracking?.shipments[0]
  const detailHref = email
    ? `/account/orders/${encodeURIComponent(orderId)}?${new URLSearchParams({ email }).toString()}`
    : "/orders/lookup"

  return (
    <div className="buyer-orders-page">
      <StoreTopBar settings={settings} cartCount={cartCount} />
      <main className="buyer-orders-main">
        {loading ? (
          <OrderTrackingEmptyState title="Loading tracking" message="Checking the order tracking API." />
        ) : error || !tracking ? (
          <OrderTrackingEmptyState title="Tracking unavailable" message={error ?? "No tracking data was returned."} />
        ) : (
          <>
            <OrderTrackingHeader orderId={tracking.orderId} displayId={displayId} tracking={tracking} />
            <section className="buyer-order-tracking-grid">
              <div className="buyer-order-tracking-left">
                <OrderTrackingShipment shipment={firstShipment} />
                <OrderTrackingTimeline events={tracking.events} />
              </div>
              <aside className="buyer-order-card buyer-order-actions">
                <p className="buyer-order-kicker">Actions</p>
                <h2>Next steps</h2>
                <a href="/store">Back to store</a>
                <a href={detailHref}>View order details</a>
                <a href="/orders/lookup">Search another order</a>
              </aside>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
