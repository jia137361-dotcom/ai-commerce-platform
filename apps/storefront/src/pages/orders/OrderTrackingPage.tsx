import { useEffect, useState } from "react"
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
  getBuyerStoreId,
  getAuthenticatedOrderDetail,
  getOrderDetail,
  getOrderTracking,
  formatBuyerMoney,
  type BuyerOrderDetail,
  type BuyerOrderTracking,
} from "../../lib/buyer-api"
import { useBuyerPageSettings } from "../../lib/useBuyerPageSettings"
import { hasOrderTrackingData } from "./order-tracking-state"

type OrderTrackingPageProps = {
  orderId: string
  cartCount: number
}

const checkoutSuccessKey = (storeId?: string) => `citigoo:${storeId ?? getBuyerStoreId()}:checkout_success`

const readSessionEmail = (orderId: string, storeId?: string) => {
  const raw = window.sessionStorage.getItem(checkoutSuccessKey(storeId))
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
  const { settings, marketplaceMode } = useBuyerPageSettings()
  const [tracking, setTracking] = useState<BuyerOrderTracking | null>(null)
  const [order, setOrder] = useState<BuyerOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | undefined>()

  const params = new URLSearchParams(window.location.search)
  const guestEmail = params.get("email")?.trim() || readSessionEmail(orderId)
  const email = auth.customer ? undefined : guestEmail
  const displayId = params.get("display_id") ?? undefined

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
        const [result, detail] = await Promise.all([
          getOrderTracking(orderId, email),
          auth.customer ? getAuthenticatedOrderDetail(orderId) : getOrderDetail(orderId, email),
        ])
        if (!active) return
        setTracking(result)
        setOrder(detail)
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
  const backHref = auth.customer ? "/account/orders" : detailHref
  const backLabel = auth.customer ? "Back to orders" : "Back to order details"
  const hasTracking = hasOrderTrackingData(tracking)

  return (
    <PageShell
      className="buyer-orders-page"
      contentClassName="buyer-orders-main"
      header={<StoreTopBar settings={settings} cartCount={cartCount} marketplaceMode={marketplaceMode} />}
      footer={<StoreFooter />}
      cartCount={cartCount}
    >
        {loading ? (
          <LoadingState label="Loading tracking..." />
        ) : error || !tracking ? (
          <>
            <a className="back-link" href={backHref}>
              ← {backLabel}
            </a>
            <ErrorState title="Tracking unavailable" message={error ?? "No tracking data was returned."} />
          </>
        ) : (
          <>
            <OrderTrackingHeader
              orderId={tracking.orderId}
              displayId={displayId}
              tracking={tracking}
              backHref={backHref}
              backLabel={backLabel}
            />
            <section className="buyer-order-tracking-grid">
              <div className="buyer-order-tracking-left">
                {!hasTracking ? <Card className="buyer-order-card buyer-order-shipment-waiting"><p className="buyer-order-kicker">Waiting for dispatch</p><h2>Tracking not available yet</h2><p>Waiting for the seller or supplier to dispatch this order. No carrier event has been reported yet.</p></Card> : null}
                {tracking.supplierOrders.length ? <OrderTrackingSupplierStatus supplierOrders={tracking.supplierOrders} /> : null}
                <OrderTrackingShipment shipment={firstShipment} />
                <OrderTrackingTimeline events={tracking.events} />
                <Card as="section" className="buyer-order-card buyer-order-package">
                  <p className="buyer-order-kicker">Package contents</p>
                  <h2>{order?.items.length ?? 0} item{order?.items.length === 1 ? "" : "s"}</h2>
                  {order?.items.length ? order.items.map((item) => <article className="buyer-order-package-item" key={item.id}>{item.thumbnail ? <img src={item.thumbnail} alt="" /> : null}<div><strong>{item.title}</strong><span>{item.variantTitle || "Default option"} · Qty {item.quantity}</span></div><strong>{item.subtotal == null ? "Not available" : formatBuyerMoney(item.subtotal, order.currencyCode ?? "usd")}</strong></article>) : <p className="buyer-order-muted">Package contents are not available.</p>}
                </Card>
              </div>
              <aside className="buyer-order-tracking-aside">
                <Card className="buyer-order-card buyer-order-payment-details"><p className="buyer-order-kicker">Payment details</p><h2>Order total</h2><dl className="buyer-order-data-grid"><div><dt>Subtotal</dt><dd>{order?.subtotal == null ? "Not available" : formatBuyerMoney(order.subtotal, order.currencyCode ?? "usd")}</dd></div><div><dt>Shipping</dt><dd>{order?.shippingTotal == null ? "Not available" : formatBuyerMoney(order.shippingTotal, order.currencyCode ?? "usd")}</dd></div><div><dt>Total</dt><dd>{order?.total == null ? "Not available" : formatBuyerMoney(order.total, order.currencyCode ?? "usd")}</dd></div><div><dt>Payment state</dt><dd>{order?.paymentStatus || "Not available"}</dd></div></dl><p className="buyer-order-muted">Authorization status is shown as returned; capture is not implied.</p></Card>
                <Card className="buyer-order-card buyer-order-actions">
                  <p className="buyer-order-kicker">Quick actions</p>
                  <h2>Order support</h2>
                  <Button href="/help">Support</Button>
                  <Button variant="secondary" href={detailHref}>View order details</Button>
                  <Button variant="ghost" disabled>Invoice · unavailable</Button>
                  <Button variant="ghost" disabled>Return / after-sales · unavailable</Button>
                  <Button variant="ghost" disabled>Share · unavailable</Button>
                </Card>
              </aside>
            </section>
          </>
        )}
    </PageShell>
  )
}
