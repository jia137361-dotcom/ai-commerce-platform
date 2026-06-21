import { useEffect, useState } from "react"
import { OrderTrackingEmptyState } from "../../components/orders/OrderTrackingEmptyState"
import { OrderTrackingHeader } from "../../components/orders/OrderTrackingHeader"
import { OrderTrackingShipment } from "../../components/orders/OrderTrackingShipment"
import { OrderTrackingTimeline } from "../../components/orders/OrderTrackingTimeline"
import { OrderTrackingSupplierStatus } from "../../components/orders/OrderTrackingSupplierStatus"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import { PageShell } from "../../components/layout/PageShell"
import { StoreFooter } from "../../components/layout/StoreFooter"
import { Button } from "../../components/ui/Button"
import { Card } from "../../components/ui/Card"
import { ErrorState, LoadingState } from "../../components/ui/States"
import { useBuyerAuth } from "../../auth/useBuyerAuth"
import {
  fetchStoreSettings,
  getBuyerStoreId,
  getOrderTracking,
  type BuyerOrderTracking,
  type BuyerStoreSettings,
} from "../../lib/buyer-api"
import { hasOrderTrackingData } from "./order-tracking-state"

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
  const auth = useBuyerAuth()
  const [settings, setSettings] = useState<BuyerStoreSettings>(fallbackSettings)
  const [tracking, setTracking] = useState<BuyerOrderTracking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | undefined>()

  const params = new URLSearchParams(window.location.search)
  const guestEmail = params.get("email")?.trim() || readSessionEmail(orderId)
  const email = auth.customer ? undefined : guestEmail
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
      if (auth.isLoading) return
      if (!auth.customer && !email) {
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
  }, [auth.customer, auth.isLoading, email, orderId])

  const firstShipment = tracking?.shipments[0]
  const detailHref = auth.customer
    ? `/account/orders/${encodeURIComponent(orderId)}`
    : guestEmail
      ? `/account/orders/${encodeURIComponent(orderId)}?${new URLSearchParams({ email: guestEmail }).toString()}`
      : "/orders/lookup"
  const hasTracking = hasOrderTrackingData(tracking)

  return (
    <PageShell
      className="buyer-orders-page"
      contentClassName="buyer-orders-main"
      header={<StoreTopBar settings={settings} cartCount={cartCount} />}
      footer={<StoreFooter />}
    >
        {loading ? (
          <LoadingState label="Loading tracking..." />
        ) : error || !tracking ? (
          <ErrorState title="Tracking unavailable" message={error ?? "No tracking data was returned."} />
        ) : !hasTracking ? (
          <OrderTrackingEmptyState
            title="Tracking not available yet"
            message="No carrier, tracking number, shipment, or delivery events have been reported for this order."
            actionHref={detailHref}
            actionLabel="View order details"
          />
        ) : (
          <>
            <OrderTrackingHeader orderId={tracking.orderId} displayId={displayId} tracking={tracking} />
            <section className="buyer-order-tracking-grid">
              <div className="buyer-order-tracking-left">
                {tracking.supplierOrders.length ? <OrderTrackingSupplierStatus supplierOrders={tracking.supplierOrders} /> : null}
                <OrderTrackingShipment shipment={firstShipment} />
                <OrderTrackingTimeline events={tracking.events} />
              </div>
              <Card as="aside" className="buyer-order-card buyer-order-actions">
                <p className="buyer-order-kicker">Actions</p>
                <h2>Next steps</h2>
                <Button href="/store">Back to store</Button>
                <Button variant="secondary" href={detailHref}>View order details</Button>
                {!auth.customer ? <Button variant="ghost" href="/orders/lookup">Search another order</Button> : null}
              </Card>
            </section>
          </>
        )}
    </PageShell>
  )
}
