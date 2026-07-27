import { useEffect, useState } from "react"
import { OrderDetailAddress } from "../../components/orders/OrderDetailAddress"
import { OrderDetailActions } from "../../components/orders/OrderDetailActions"
import { OrderDetailEmptyState } from "../../components/orders/OrderDetailEmptyState"
import { OrderDetailHeader } from "../../components/orders/OrderDetailHeader"
import { OrderDetailItems } from "../../components/orders/OrderDetailItems"
import { OrderDetailSummary } from "../../components/orders/OrderDetailSummary"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import { PageShell } from "../../components/layout/PageShell"
import { StoreFooter } from "../../components/layout/StoreFooter"
import { Button } from "../../components/ui/Button"
import { Modal } from "../../components/ui/Modal"
import { SelectField } from "../../components/ui/SelectField"
import { TextArea } from "../../components/ui/TextArea"
import { ErrorState, LoadingState } from "../../components/ui/States"
import { useBuyerAuth } from "../../auth/useBuyerAuth"
import {
  cancelAuthenticatedOrder,
  createRefundRequest,
  getBuyerStoreId,
  getAuthenticatedOrderDetail,
  getOrderDetail,
  readBuyerPreferences,
  reorderItemsToCheckout,
  type BuyerOrderDetail,
} from "../../lib/buyer-api"
import { useBuyerPageSettings } from "../../lib/useBuyerPageSettings"
import { resolveOrderDetailActions } from "./order-detail-state"
import { collectReorderLinesFromDetail, orderAgainHref } from "./order-history-display"

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

export function OrderDetailPage({ orderId, cartCount }: OrderDetailPageProps) {
  const auth = useBuyerAuth()
  const { settings, marketplaceMode } = useBuyerPageSettings()
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
  const [orderAgainLoading, setOrderAgainLoading] = useState(false)
  const [orderAgainError, setOrderAgainError] = useState<string | undefined>()

  const params = new URLSearchParams(window.location.search)
  const guestEmail = params.get("email")?.trim() || readSessionEmail(orderId)
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
    orderStatus: order?.status,
    cancellation: order?.cancellation,
    refundRequest: order?.refundRequest,
  })
  const canCancel = actionState.showCancel
  const canRequestRefund = actionState.showRequestRefund

  const handleOrderAgain = async () => {
    if (!order || orderAgainLoading) return
    const lines = collectReorderLinesFromDetail(order)
    if (!lines.length) {
      setOrderAgainError("This order has no purchasable variants to order again.")
      return
    }
    setOrderAgainLoading(true)
    setOrderAgainError(undefined)
    try {
      const storeId = order.storeId?.trim() || getBuyerStoreId()
      const { checkoutHref } = await reorderItemsToCheckout({
        storeId,
        countryCode: readBuyerPreferences(auth.customer).countryCode,
        items: lines,
        customerId: auth.customer?.id ?? null,
      })
      window.location.assign(checkoutHref)
    } catch (reorderError) {
      setOrderAgainError(
        reorderError instanceof Error ? reorderError.message : "Unable to prepare the cart for reorder."
      )
      setOrderAgainLoading(false)
    }
  }

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
    <PageShell
      className="buyer-orders-page buyer-orders-page--temu"
      contentClassName="buyer-orders-main buyer-order-detail-main-shell"
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
            <OrderDetailHeader order={order} storeName={settings.brandName?.trim() || "Store"} />
            {/* Merchant Info intentionally omitted per 页面分析 annotation */}
            <section className="buyer-order-detail-stack">
              <OrderDetailItems order={order} />
              <OrderDetailAddress address={order.shippingAddress} email={order.email} trackingHref={trackingHref} />
              <OrderDetailSummary order={order} />
              <OrderDetailActions
                order={order}
                isAuthenticated={Boolean(auth.customer)}
                trackingHref={trackingHref}
                orderAgainHref={
                  order.items.find((item) => item.productId)?.productId
                    ? orderAgainHref({
                        orderId: order.orderId,
                        itemCount: order.items.length,
                        previewItems: order.items.map((item) => ({
                          title: item.title,
                          quantity: item.quantity,
                          productId: item.productId,
                          variantId: item.variantId,
                        })),
                        storeId: order.storeId,
                      })
                    : "/store"
                }
                onOrderAgain={() => {
                  void handleOrderAgain()
                }}
                orderAgainLoading={orderAgainLoading}
                orderAgainError={orderAgainError}
                onCancel={() => {
                  setCancelOpen(true)
                  setCancelError(undefined)
                  setCancelSuccess(undefined)
                }}
                onRequestRefund={() => {
                  setRefundOpen(true)
                  setRefundError(undefined)
                  setRefundSuccess(undefined)
                }}
                cancelSuccess={cancelSuccess}
                cancelError={!cancelOpen ? cancelError : undefined}
                refundSuccess={refundSuccess}
                refundError={!refundOpen ? refundError : undefined}
              />
            </section>
          </>
        )}
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
    </PageShell>
  )
}
