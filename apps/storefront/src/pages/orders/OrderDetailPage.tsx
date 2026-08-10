import { useEffect, useRef, useState } from "react"
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
  listRefundRequests,
  formatBuyerMoney,
  updateRefundRequest,
  readBuyerPreferences,
  reorderItemsToCheckout,
  type BuyerOrderDetail,
  type BuyerRefundRequest,
} from "../../lib/buyer-api"
import { useBuyerPageSettings } from "../../lib/useBuyerPageSettings"
import { buildSettingsStoreHref } from "../../lib/storefront-links"
import { resolveOrderDetailActions } from "./order-detail-state"
import { collectReorderLinesFromDetail, orderAgainHref } from "./order-history-display"
import {
  buildRefundSelection,
  canBuyerCancelRefund,
  canBuyerProvideRefundInformation,
  REFUND_REASONS,
  refundStatusLabel,
} from "./refund-request-state"

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
  const storeHref = buildSettingsStoreHref(settings)
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
  const [refundQuantities, setRefundQuantities] = useState<Record<string, number>>({})
  const [refundRequests, setRefundRequests] = useState<BuyerRefundRequest[]>([])
  const [refundActionNotes, setRefundActionNotes] = useState<Record<string, string>>({})
  const [refundActionBusy, setRefundActionBusy] = useState<string | null>(null)
  const [refundActionError, setRefundActionError] = useState<string | undefined>()
  const refundIdempotencyKeyRef = useRef<string | null>(null)
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
        if (auth.customer) {
          try {
            const requests = await listRefundRequests(orderId)
            if (active) setRefundRequests(requests)
          } catch (refundLoadError) {
            console.warn("[order-detail] unable to load refund history", refundLoadError)
            if (active) setRefundRequests(result.refundRequest?.openRequest ? [result.refundRequest.openRequest] : [])
          }
        } else {
          setRefundRequests([])
        }
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
  const refundSelection = order
    ? buildRefundSelection(order.items, refundQuantities, order.total)
    : { items: [], fullOrder: false, estimatedAmount: 0 }

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
    if (!refundSelection.items.length) {
      setRefundError("Select at least one item and quantity.")
      return
    }
    setRefundSubmitting(true)
    setRefundError(undefined)
    setRefundSuccess(undefined)
    try {
      refundIdempotencyKeyRef.current ??= window.crypto.randomUUID()
      const request = await createRefundRequest(order.orderId, {
        reason: refundReason,
        note: refundNote,
        items: refundSelection.fullOrder ? undefined : refundSelection.items,
        idempotencyKey: refundIdempotencyKeyRef.current,
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
      setRefundRequests((current) => [request, ...current.filter((entry) => entry.id !== request.id)])
      setRefundOpen(false)
      setRefundReason("")
      setRefundNote("")
      setRefundQuantities({})
      refundIdempotencyKeyRef.current = null
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

  const handleRefundAction = async (
    request: BuyerRefundRequest,
    action: "cancel" | "provide_information"
  ) => {
    if (!order || refundActionBusy) return
    const note = refundActionNotes[request.id]?.trim()
    if (action === "provide_information" && !note) {
      setRefundActionError("Add the requested information before submitting.")
      return
    }
    setRefundActionBusy(request.id)
    setRefundActionError(undefined)
    try {
      const updated = await updateRefundRequest(order.orderId, request.id, { action, note })
      setRefundRequests((current) => current.map((entry) => entry.id === updated.id ? updated : entry))
      setOrder((current) => current ? {
        ...current,
        refundRequest: action === "cancel"
          ? { allowed: true, code: null, message: null, openRequest: null }
          : { allowed: false, code: "ORDER_REFUND_REQUEST_EXISTS", message: "A refund request is under review.", openRequest: updated },
      } : current)
      setRefundActionNotes((current) => ({ ...current, [request.id]: "" }))
    } catch (actionError) {
      setRefundActionError(actionError instanceof Error ? actionError.message : "Unable to update refund request.")
    } finally {
      setRefundActionBusy(null)
    }
  }

  return (
    <PageShell
      className="buyer-orders-page buyer-orders-page--temu"
      contentClassName="buyer-orders-main buyer-order-detail-main-shell"
      header={<StoreTopBar settings={settings} cartCount={cartCount} marketplaceMode={marketplaceMode} />}
      footer={<StoreFooter />}
      cartCount={cartCount}
      storeHref={storeHref}
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
                  setRefundQuantities(Object.fromEntries(order.items.map((item) => [item.id, item.quantity])))
                  refundIdempotencyKeyRef.current = null
                  setRefundOpen(true)
                  setRefundError(undefined)
                  setRefundSuccess(undefined)
                }}
                cancelSuccess={cancelSuccess}
                cancelError={!cancelOpen ? cancelError : undefined}
                refundSuccess={refundSuccess}
                refundError={!refundOpen ? refundError : undefined}
              />
              {refundRequests.length ? (
                <section className="buyer-order-card buyer-order-refund-timeline" aria-label="Refund status">
                  <h2>Refund status</h2>
                  {refundActionError ? <p className="buyer-order-error" role="alert">{refundActionError}</p> : null}
                  {refundRequests.map((request) => (
                    <article key={request.id} className="buyer-order-refund-timeline-entry">
                      <span aria-hidden="true" />
                      <div>
                        <strong>{refundStatusLabel(request)}</strong>
                        <p>{request.reason.replace(/_/g, " ")}</p>
                        <small>{request.updatedAt ?? request.createdAt ? new Date(request.updatedAt ?? request.createdAt!).toLocaleString() : "Status updated"}</small>
                        {canBuyerProvideRefundInformation(request.status) ? (
                          <div className="buyer-order-refund-followup">
                            <TextArea
                              label="Additional information"
                              value={refundActionNotes[request.id] ?? ""}
                              maxLength={1000}
                              onChange={(event) => setRefundActionNotes((current) => ({ ...current, [request.id]: event.target.value }))}
                            />
                            <Button
                              variant="primary"
                              loading={refundActionBusy === request.id}
                              onClick={() => void handleRefundAction(request, "provide_information")}
                            >
                              Submit information
                            </Button>
                          </div>
                        ) : null}
                        {canBuyerCancelRefund(request.status) ? (
                          <Button
                            variant="ghost"
                            disabled={Boolean(refundActionBusy)}
                            onClick={() => void handleRefundAction(request, "cancel")}
                          >
                            Cancel request
                          </Button>
                        ) : null}
                      </div>
                      <b>{formatBuyerMoney(request.approvedAmount ?? request.requestedAmount, request.currencyCode ?? order.currencyCode ?? undefined)}</b>
                    </article>
                  ))}
                </section>
              ) : null}
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
                disabled={!refundReason || !refundSelection.items.length}
                onClick={() => void submitRefundRequest()}
              >
                {refundSubmitting ? "Submitting..." : "Submit request"}
              </Button>
            </>
          )}
        >
            {refundError ? <p className="buyer-order-error">{refundError}</p> : null}
            <fieldset className="buyer-order-refund-items">
              <legend>Items and quantity</legend>
              {order.items.map((item) => {
                const quantity = refundQuantities[item.id] ?? 0
                return (
                  <div className="buyer-order-refund-item" key={item.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={quantity > 0}
                        onChange={(event) => setRefundQuantities((current) => ({
                          ...current,
                          [item.id]: event.target.checked ? item.quantity : 0,
                        }))}
                      />
                      <span>{item.title}</span>
                    </label>
                    <input
                      aria-label={`Refund quantity for ${item.title}`}
                      type="number"
                      min="1"
                      max={item.quantity}
                      disabled={quantity === 0}
                      value={quantity || ""}
                      onChange={(event) => setRefundQuantities((current) => ({
                        ...current,
                        [item.id]: Math.min(item.quantity, Math.max(1, Number(event.target.value) || 1)),
                      }))}
                    />
                  </div>
                )
              })}
            </fieldset>
            <div className="buyer-order-refund-estimate">
              <span>Estimated request</span>
              <strong>{formatBuyerMoney(refundSelection.estimatedAmount, order.currencyCode ?? undefined)}</strong>
              <small>Final eligible amount is calculated by the payment service.</small>
            </div>
            <SelectField
              label="Reason"
              value={refundReason}
              onChange={(event) => setRefundReason(event.target.value)}
            >
                <option value="">Select a reason</option>
                {REFUND_REASONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
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
