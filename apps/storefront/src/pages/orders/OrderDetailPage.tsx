import { useEffect, useState } from "react"
import { OrderDetailEmptyState } from "../../components/orders/OrderDetailEmptyState"
import { OrderDetailHeader } from "../../components/orders/OrderDetailHeader"
import { OrderDetailItems } from "../../components/orders/OrderDetailItems"
import { OrderDetailSummary } from "../../components/orders/OrderDetailSummary"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import { PageShell } from "../../components/layout/PageShell"
import { StoreFooter } from "../../components/layout/StoreFooter"
import { Button } from "../../components/ui/Button"
import { ErrorState, LoadingState } from "../../components/ui/States"
import { useBuyerAuth } from "../../auth/useBuyerAuth"
import {
  getBuyerStoreId,
  getAuthenticatedOrderDetail,
  getOrderDetail,
  getOrderTracking,
  type BuyerOrderDetail,
  type BuyerOrderTracking,
} from "../../lib/buyer-api"
import { useBuyerPageSettings } from "../../lib/useBuyerPageSettings"
import { humanizeOrderStatus, paymentStatusPresentation } from "./order-status"

type OrderDetailPageProps = {
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
    console.warn("[order-detail] unable to parse checkout success data", error)
  }
  return undefined
}

const formatDate = (value?: string | null) => {
  if (!value) return "Not available"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

const readAddress = (address: Record<string, unknown> | null | undefined, key: string) => {
  const value = address?.[key]
  return typeof value === "string" && value.trim() ? value : undefined
}

const addressLines = (order: BuyerOrderDetail) => [
  [readAddress(order.shippingAddress, "first_name"), readAddress(order.shippingAddress, "last_name")].filter(Boolean).join(" "),
  readAddress(order.shippingAddress, "address_1"),
  readAddress(order.shippingAddress, "address_2"),
  [readAddress(order.shippingAddress, "city"), readAddress(order.shippingAddress, "province"), readAddress(order.shippingAddress, "postal_code")].filter(Boolean).join(", "),
  readAddress(order.shippingAddress, "country_code")?.toUpperCase(),
  readAddress(order.shippingAddress, "phone"),
].filter(Boolean)

function OrderProgressRail({ order, tracking }: { order: BuyerOrderDetail; tracking: BuyerOrderTracking | null }) {
  const shippedAt = tracking?.shipments[0]?.shippedAt ?? tracking?.events.find((event) => /ship|transit|dispatch/i.test(event.label))?.date
  const deliveredAt = tracking?.shipments[0]?.deliveredAt
  const paid = ["authorized", "captured", "paid", "completed"].includes((order.paymentStatus ?? "").toLowerCase())
  const shipped = Boolean(shippedAt || ["shipped", "partially_shipped", "fulfilled"].includes((order.fulfillmentStatus ?? "").toLowerCase()))
  const delivered = Boolean(deliveredAt || ["delivered"].includes((order.fulfillmentStatus ?? "").toLowerCase()))
  const steps = [
    { label: "Order placed", date: order.createdAt, done: true, icon: "✓" },
    { label: "Payment confirmed", date: paid ? order.createdAt : undefined, done: paid, icon: "✓" },
    { label: "Shipped", date: shippedAt, done: shipped, icon: "↗" },
    { label: "Delivered", date: deliveredAt, done: delivered, icon: "□" },
  ]
  return <section className="buyer-order-progress-rail" aria-label="Order progress">
    {steps.map((step, index) => <article key={step.label} className={step.done ? "done" : ""}>
      <span>{step.icon}</span>
      <strong>{step.label}</strong>
      <small>{step.date ? formatDate(step.date) : index === steps.length - 1 ? "Estimated after shipment" : "Pending"}</small>
    </article>)}
  </section>
}

function OrderLogisticsOverview({ order, tracking }: { order: BuyerOrderDetail; tracking: BuyerOrderTracking | null }) {
  const latestEvent = tracking?.events[0]
  const latestSupplier = tracking?.supplierOrders.find((entry) => entry.logisticsStatusText || entry.logisticsStatus || entry.trackingNumber)
  const lines = addressLines(order)
  return <section className="buyer-order-logistics-card">
    <div>
      <span className="buyer-order-logistics-badge">{tracking?.shipments.length || tracking?.events.length ? "In transit" : "Waiting"}</span>
      <h2>{tracking?.shipments.length || tracking?.events.length ? "Shipping in progress" : "Preparing shipment"}</h2>
      <p>{latestEvent?.date ? `Latest update ${formatDate(latestEvent.date)}` : "Tracking will appear after the seller or supplier dispatches the package."}</p>
    </div>
    <nav>
      <Button href="/account/orders">Back to orders</Button>
    </nav>
    <section>
      <div>
        <p className="buyer-order-kicker">Delivery address</p>
        {lines.length ? lines.map((line) => <p key={line}>{line}</p>) : <p>Not provided</p>}
        {order.email ? <p>{order.email}</p> : null}
      </div>
      <div>
        <p className="buyer-order-kicker">Latest milestone</p>
        <strong>{latestEvent?.label ?? latestSupplier?.logisticsStatusText ?? latestSupplier?.logisticsStatus ?? "No carrier milestone yet"}</strong>
        <p>{latestSupplier?.trackingNumber ? `Tracking number ${latestSupplier.trackingNumber}` : latestEvent?.status ?? "Waiting for logistics sync."}</p>
        {latestEvent?.date ? <small>{formatDate(latestEvent.date)}</small> : null}
      </div>
    </section>
  </section>
}

function OrderInfoPanel({ order, tracking }: { order: BuyerOrderDetail; tracking: BuyerOrderTracking | null }) {
  const payment = paymentStatusPresentation(order.paymentStatus)
  const shippedAt = tracking?.shipments[0]?.shippedAt ?? tracking?.events.find((event) => /ship|transit|dispatch/i.test(event.label))?.date
  return <section className="buyer-order-info-card buyer-order-card">
    <p className="buyer-order-kicker">Order information</p>
    <dl>
      <div><dt>Payment method</dt><dd>{payment.label}</dd></div>
      <div><dt>Order time</dt><dd>{formatDate(order.createdAt)}</dd></div>
      <div><dt>Payment status</dt><dd>{humanizeOrderStatus(order.paymentStatus)}</dd></div>
      <div><dt>Shipping time</dt><dd>{formatDate(shippedAt)}</dd></div>
    </dl>
  </section>
}

function OrderQuickActions({ orderId }: { orderId: string }) {
  return <section className="buyer-order-quick-actions buyer-order-card">
    <p className="buyer-order-kicker">Quick actions</p>
    <div>
      <a href="/help/contact-us">Support</a>
      <a href={`/account/messages?orderId=${encodeURIComponent(orderId)}`}>Message</a>
      <a href="/account/orders">Orders</a>
    </div>
  </section>
}

export function OrderDetailPage({ orderId, cartCount }: OrderDetailPageProps) {
  const auth = useBuyerAuth()
  const { settings, marketplaceMode } = useBuyerPageSettings({ marketplace: true })
  const [order, setOrder] = useState<BuyerOrderDetail | null>(null)
  const [tracking, setTracking] = useState<BuyerOrderTracking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | undefined>()

  const params = new URLSearchParams(window.location.search)
  const guestEmail = params.get("email")?.trim() || readSessionEmail(orderId)
  const storeId = params.get("store")?.trim() || undefined
  const email = auth.customer ? undefined : guestEmail

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      setError(undefined)
      if (auth.isLoading) return
      if (!auth.customer && !email) {
        setOrder(null)
        setError("Order detail requires the email associated with the order.")
        setLoading(false)
        return
      }
      try {
        const [detailResult, trackingResult] = await Promise.allSettled([
          auth.customer ? getAuthenticatedOrderDetail(orderId, { storeId }) : getOrderDetail(orderId, email, { storeId }),
          getOrderTracking(orderId, email, { storeId }),
        ])
        if (!active) return
        if (detailResult.status === "rejected") throw detailResult.reason
        setOrder(detailResult.value)
        setTracking(trackingResult.status === "fulfilled" ? trackingResult.value : null)
      } catch (detailError) {
        if (!active) return
        setOrder(null)
        setTracking(null)
        setError(detailError instanceof Error ? detailError.message : "Unable to load order detail.")
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [auth.customer, auth.isLoading, email, orderId, storeId])

  return (
    <PageShell
      className="buyer-orders-page"
      contentClassName="buyer-orders-main"
      header={<StoreTopBar settings={settings} cartCount={cartCount} marketplaceMode={marketplaceMode} />}
      footer={<StoreFooter />}
    >
        {loading ? (
          <LoadingState label="Loading order..." />
        ) : error || !order ? (
          <>
            <ErrorState title="Order detail unavailable" message={error ?? "No order detail was returned."} />
            <OrderDetailEmptyState title="Find another order" message="Guest buyers can search again with their checkout email and display id." />
          </>
        ) : (
          <>
            <OrderDetailHeader order={order} />
            <OrderProgressRail order={order} tracking={tracking} />
            <section className="buyer-order-detail-grid buyer-order-detail-redesign">
              <div className="buyer-order-detail-main">
                <OrderLogisticsOverview order={order} tracking={tracking} />
                <OrderDetailItems order={order} />
              </div>
              <aside className="buyer-order-detail-side">
                <OrderDetailSummary order={order} />
                <OrderInfoPanel order={order} tracking={tracking} />
                <OrderQuickActions orderId={order.orderId} />
              </aside>
            </section>
          </>
        )}
    </PageShell>
  )
}
