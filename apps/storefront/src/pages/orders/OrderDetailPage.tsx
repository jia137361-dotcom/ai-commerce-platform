import { useEffect, useState } from "react"
import { OrderDetailAddress } from "../../components/orders/OrderDetailAddress"
import { OrderDetailEmptyState } from "../../components/orders/OrderDetailEmptyState"
import { OrderDetailHeader } from "../../components/orders/OrderDetailHeader"
import { OrderDetailItems } from "../../components/orders/OrderDetailItems"
import { OrderDetailSummary } from "../../components/orders/OrderDetailSummary"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import { Button } from "../../components/ui/Button"
import { Card } from "../../components/ui/Card"
import { Modal } from "../../components/ui/Modal"
import { SelectField } from "../../components/ui/SelectField"
import { StatusBadge } from "../../components/ui/StatusBadge"
import { TextArea } from "../../components/ui/TextArea"
import { useBuyerAuth } from "../../auth/useBuyerAuth"
import {
  cancelAuthenticatedOrder,
  createRefundRequest,
  fetchStoreSettings,
  getBuyerStoreId,
  getAuthenticatedOrderDetail,
  getOrderDetail,
  type BuyerOrderDetail,
  type BuyerStoreSettings,
} from "../../lib/buyer-api"
import { resolveOrderDetailActions } from "./order-detail-state"

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
  const [refundOpen, setRefundOpen] = useState(false)
  const [refundReason, setRefundReason] = useState("")
  const [refundNote, setRefundNote] = useState("")
  const [refundSubmitting, setRefundSubmitting] = useState(false)
  const [refundError, setRefundError] = useState<string | undefined>()
  const [refundSuccess, setRefundSuccess] = useState<string | undefined>()

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
        const result = auth.customer
          ? await getAuthenticatedOrderDetail(orderId)
          : await getOrderDetail(orderId, email)
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
  const actionState = resolveOrderDetailActions({
    isAuthenticated: Boolean(auth.customer),
    cancellation: order?.cancellation,
    refundRequest: order?.refundRequest,
  })
  const canCancel = actionState.showCancel
  const canRequestRefund = actionState.showRequestRefund

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

  const submitRefundRequest = async () => {
    if (!order || !canRequestRefund || refundSubmitting) return
    if (!refundReason) {
      setRefundError("Select a reason for the refund request.")
      return
    }
    setRefundSubmitting(true)
    setRefundError(undefined)
    setRefundSuccess(undefined)
    try {
      const request = await createRefundRequest(order.orderId, {
        reason: refundReason,
        note: refundNote,
      })
      setOrder((current) => current ? {
        ...current,
        refundRequest: {
          allowed: false,
          code: "ORDER_REFUND_REQUEST_EXISTS",
          message: "A refund request is already pending for this order.",
          openRequest: request,
        },
      } : current)
      setRefundSuccess("Refund request submitted. Status: Pending review.")
      setRefundOpen(false)
      setRefundReason("")
      setRefundNote("")
    } catch (refundFailure) {
      setRefundError(
        refundFailure instanceof Error
          ? refundFailure.message
          : "Unable to submit refund request."
      )
    } finally {
      setRefundSubmitting(false)
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
                <Card as="section" className="buyer-order-actions">
                  <p className="buyer-order-kicker">Actions</p>
                  <h2>Next steps</h2>
                  <Button href={trackingHref}>Track order</Button>
                  {canCancel ? (
                    <Button
                      variant="danger"
                      onClick={() => {
                        setCancelOpen(true)
                        setCancelError(undefined)
                        setCancelSuccess(undefined)
                      }}
                    >
                      Cancel order
                    </Button>
                  ) : order.cancellation?.message && auth.customer ? (
                    <p className="buyer-order-action-note">{order.cancellation.message}</p>
                  ) : null}
                  {canRequestRefund ? (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setRefundOpen(true)
                        setRefundError(undefined)
                        setRefundSuccess(undefined)
                      }}
                    >
                      Request refund
                    </Button>
                  ) : actionState.showPendingRefund && order.refundRequest?.openRequest ? (
                    <div className="buyer-order-refund-status">
                      <strong>Refund requested</strong>
                      <StatusBadge tone="warning">Pending review</StatusBadge>
                      <small>
                        Submitted {order.refundRequest.openRequest.createdAt
                          ? new Date(order.refundRequest.openRequest.createdAt).toLocaleDateString()
                          : "recently"}
                      </small>
                    </div>
                  ) : null}
                  {cancelSuccess ? <p className="buyer-order-action-success">{cancelSuccess}</p> : null}
                  {cancelError && !cancelOpen ? <p className="buyer-order-error">{cancelError}</p> : null}
                  {refundSuccess ? <p className="buyer-order-action-success">{refundSuccess}</p> : null}
                  {refundError && !refundOpen ? <p className="buyer-order-error">{refundError}</p> : null}
                  <Button variant="secondary" href="/store">Back to store</Button>
                  {actionState.showSearchAnotherOrder ? (
                    <Button variant="ghost" href="/orders/lookup">Search another order</Button>
                  ) : (
                    <Button variant="ghost" href="/account/orders">Back to orders</Button>
                  )}
                </Card>
              </aside>
            </section>
          </>
        )}
      </main>
      {order ? (
        <Modal
          open={cancelOpen}
          eyebrow="Order action"
          title="Cancel order?"
          description="This action can only be completed for unpaid and unfulfilled orders."
          onClose={() => setCancelOpen(false)}
          footer={(
            <>
              <Button variant="secondary" disabled={cancelSubmitting} onClick={() => setCancelOpen(false)}>
                Keep order
              </Button>
              <Button variant="danger" loading={cancelSubmitting} onClick={() => void submitCancel()}>
                {cancelSubmitting ? "Cancelling..." : "Cancel order"}
              </Button>
            </>
          )}
        >
            {cancelError ? <p className="buyer-order-error">{cancelError}</p> : null}
            <TextArea
              label="Reason optional"
              value={cancelReason}
              maxLength={500}
              onChange={(event) => setCancelReason(event.target.value)}
              placeholder="Ordered by mistake"
            />
        </Modal>
      ) : null}
      {order ? (
        <Modal
          open={refundOpen}
          eyebrow="Order support"
          title="Request refund"
          description="This submits a request for review. It does not immediately return money."
          onClose={() => setRefundOpen(false)}
          footer={(
            <>
              <Button variant="secondary" disabled={refundSubmitting} onClick={() => setRefundOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={refundSubmitting}
                disabled={!refundReason}
                onClick={() => void submitRefundRequest()}
              >
                {refundSubmitting ? "Submitting..." : "Submit request"}
              </Button>
            </>
          )}
        >
            {refundError ? <p className="buyer-order-error">{refundError}</p> : null}
            <SelectField
              label="Reason"
              value={refundReason}
              onChange={(event) => setRefundReason(event.target.value)}
            >
                <option value="">Select a reason</option>
                <option value="Ordered by mistake">Ordered by mistake</option>
                <option value="Wrong item">Wrong item</option>
                <option value="Item damaged">Item damaged</option>
                <option value="Item not received">Item not received</option>
                <option value="Other">Other</option>
            </SelectField>
            <TextArea
              label="Additional note optional"
              value={refundNote}
              maxLength={1000}
              onChange={(event) => setRefundNote(event.target.value)}
              placeholder="Add details for the review team"
            />
        </Modal>
      ) : null}
    </div>
  )
}
