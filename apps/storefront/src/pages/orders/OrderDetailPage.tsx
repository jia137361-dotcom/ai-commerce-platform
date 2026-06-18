import { useEffect, useState } from "react"
import { OrderDetailAddress } from "../../components/orders/OrderDetailAddress"
import { OrderDetailEmptyState } from "../../components/orders/OrderDetailEmptyState"
import { OrderDetailHeader } from "../../components/orders/OrderDetailHeader"
import { OrderDetailItems } from "../../components/orders/OrderDetailItems"
import { OrderDetailSummary } from "../../components/orders/OrderDetailSummary"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import { useBuyerAuth } from "../../auth/useBuyerAuth"
import {
  cancelAuthenticatedOrder,
  fetchStoreSettings,
  getBuyerStoreId,
  getOrderDetail,
  type BuyerOrderDetail,
  type BuyerStoreSettings,
} from "../../lib/buyer-api"

type OrderDetailPageProps = {
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
    console.warn("[order-detail] unable to parse checkout success data", error)
  }
  return undefined
}

export function OrderDetailPage({ orderId, cartCount }: OrderDetailPageProps) {
  const auth = useBuyerAuth()
  const [settings, setSettings] = useState<BuyerStoreSettings>(fallbackSettings)
  const [order, setOrder] = useState<BuyerOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | undefined>()
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [cancelSubmitting, setCancelSubmitting] = useState(false)
  const [cancelError, setCancelError] = useState<string | undefined>()
  const [cancelSuccess, setCancelSuccess] = useState<string | undefined>()

  const params = new URLSearchParams(window.location.search)
  const guestEmail = params.get("email")?.trim() || readSessionEmail(orderId)
  const email = auth.customer ? undefined : guestEmail

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
        setOrder(null)
        setError("Order detail requires the email associated with the order.")
        setLoading(false)
        return
      }
      try {
        const result = await getOrderDetail(orderId, email)
        if (!active) return
        setOrder(result)
      } catch (detailError) {
        if (!active) return
        setOrder(null)
        setError(detailError instanceof Error ? detailError.message : "Unable to load order detail.")
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [auth.customer, auth.isLoading, email, orderId])

  const trackingParams = new URLSearchParams()
  if (guestEmail && !auth.customer) trackingParams.set("email", guestEmail)
  if (order?.displayId) trackingParams.set("display_id", order.displayId)
  const trackingQuery = trackingParams.toString()
  const trackingHref = auth.customer || guestEmail ? `/account/orders/${encodeURIComponent(orderId)}/tracking${trackingQuery ? `?${trackingQuery}` : ""}` : "/orders/lookup"
  const canCancel = Boolean(auth.customer && order?.cancellation?.allowed)

  const submitCancel = async () => {
    if (!order || !canCancel || cancelSubmitting) return
    setCancelSubmitting(true)
    setCancelError(undefined)
    setCancelSuccess(undefined)
    try {
      const result = await cancelAuthenticatedOrder(order.orderId, cancelReason)
      setOrder((current) => current ? {
        ...current,
        status: result.order.status ?? "cancelled",
        paymentStatus: result.order.paymentStatus ?? current.paymentStatus,
        fulfillmentStatus: result.order.fulfillmentStatus ?? current.fulfillmentStatus,
        cancellation: result.cancellation ?? {
          allowed: false,
          code: "ORDER_ALREADY_CANCELLED",
          message: "This order has already been cancelled.",
        },
      } : current)
      setCancelSuccess(result.alreadyCancelled ? "Order was already cancelled." : "Order cancelled.")
      setCancelOpen(false)
      setCancelReason("")
    } catch (cancelFailure) {
      const message = cancelFailure instanceof Error ? cancelFailure.message : "Unable to cancel this order."
      setCancelError(message)
    } finally {
      setCancelSubmitting(false)
    }
  }

  return (
    <div className="buyer-orders-page">
      <StoreTopBar settings={settings} cartCount={cartCount} />
      <main className="buyer-orders-main">
        {loading ? (
          <OrderDetailEmptyState title="Loading order" message="Checking the order detail API." />
        ) : error || !order ? (
          <OrderDetailEmptyState title="Order detail unavailable" message={error ?? "No order detail was returned."} />
        ) : (
          <>
            <OrderDetailHeader order={order} />
            <section className="buyer-order-detail-grid">
              <div className="buyer-order-detail-main">
                <OrderDetailItems order={order} />
                <OrderDetailAddress address={order.shippingAddress} email={order.email} />
              </div>
              <aside className="buyer-order-detail-side">
                <OrderDetailSummary order={order} />
                <section className="buyer-order-card buyer-order-actions">
                  <p className="buyer-order-kicker">Actions</p>
                  <h2>Next steps</h2>
                  <a href={trackingHref}>Track order</a>
                  {canCancel ? (
                    <button
                      type="button"
                      className="buyer-order-danger-action"
                      onClick={() => {
                        setCancelOpen(true)
                        setCancelError(undefined)
                        setCancelSuccess(undefined)
                      }}
                    >
                      Cancel order
                    </button>
                  ) : order.cancellation?.message && auth.customer ? (
                    <p className="buyer-order-action-note">{order.cancellation.message}</p>
                  ) : null}
                  {cancelSuccess ? <p className="buyer-order-action-success">{cancelSuccess}</p> : null}
                  {cancelError && !cancelOpen ? <p className="buyer-order-error">{cancelError}</p> : null}
                  <a href="/store">Back to store</a>
                  <a href="/orders/lookup">Search another order</a>
                </section>
              </aside>
            </section>
          </>
        )}
      </main>
      {cancelOpen && order ? (
        <div className="buyer-order-modal-backdrop" role="presentation">
          <div className="buyer-order-modal buyer-order-card" role="dialog" aria-modal="true" aria-labelledby="cancel-order-title">
            <header>
              <p className="buyer-order-kicker">Order action</p>
              <h2 id="cancel-order-title">Cancel order?</h2>
              <p>This action can only be completed for unpaid and unfulfilled orders.</p>
            </header>
            {cancelError ? <p className="buyer-order-error">{cancelError}</p> : null}
            <label className="buyer-order-field">
              <span>Reason optional</span>
              <textarea
                value={cancelReason}
                maxLength={500}
                onChange={(event) => setCancelReason(event.target.value)}
                placeholder="Ordered by mistake"
              />
            </label>
            <footer>
              <button type="button" disabled={cancelSubmitting} onClick={() => setCancelOpen(false)}>
                Keep order
              </button>
              <button
                type="button"
                className="buyer-order-danger-action"
                disabled={cancelSubmitting}
                onClick={() => void submitCancel()}
              >
                {cancelSubmitting ? "Cancelling..." : "Cancel order"}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  )
}
