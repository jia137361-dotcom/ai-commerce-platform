import { useState } from "react"
import {
  createRefundRequest,
  formatBuyerMoney,
  readBuyerPreferences,
  reorderItemsToCheckout,
  type BuyerOrderSummary,
} from "../../lib/buyer-api"
import { useBuyerAuth } from "../../auth/useBuyerAuth"
import {
  buildViewReviewHref,
  buyerOrderDisplayStatusLabel,
  canConfirmReceipt,
  canRequestRefund,
  canTrackOrder,
  canViewReview,
  collectReorderLinesFromSummary,
  formatOrderTime,
  orderAgainHref,
  resolveBuyerOrderDisplayStatus,
} from "../../pages/orders/order-history-display"
import { OrderReviewDialog } from "../reviews/OrderReviewDialog"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import { ConfirmDeliverySheet } from "./ConfirmDeliverySheet"
import { OrderPreviewImage } from "./OrderPreviewImage"

type OrderHistoryCardProps = {
  order: BuyerOrderSummary
  storeName?: string
  customerEmail?: string | null
  customerName?: string | null
  onConfirmReceipt?: (orderId: string) => Promise<void>
  onCancelOrder?: (orderId: string) => void
  onReviewSubmitted?: () => void
  onRefundSubmitted?: () => void
}

const MAX_THUMBS = 5

export function OrderHistoryCard({
  order,
  storeName = "Store",
  customerEmail,
  customerName,
  onConfirmReceipt,
  onCancelOrder,
  onReviewSubmitted,
  onRefundSubmitted,
}: OrderHistoryCardProps) {
  const auth = useBuyerAuth()
  const displayStatus = resolveBuyerOrderDisplayStatus(order)
  const statusLabel = order.buyerDisplayStatusLabel || buyerOrderDisplayStatusLabel(displayStatus)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [confirmationError, setConfirmationError] = useState<string>()
  const [refundError, setRefundError] = useState<string>()
  const [refundSubmitting, setRefundSubmitting] = useState<"return" | "refund" | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [openReviewAfterConfirm, setOpenReviewAfterConfirm] = useState(false)
  const [orderAgainLoading, setOrderAgainLoading] = useState(false)
  const [orderAgainError, setOrderAgainError] = useState<string>()
  const viewReviewHref = buildViewReviewHref(order)
  const detailHref = `/account/orders/${encodeURIComponent(order.orderId)}`
  const againHref = orderAgainHref(order)
  const totalLabel =
    order.total != null ? formatBuyerMoney(order.total, order.currencyCode ?? undefined) : "—"
  const thumbs = order.previewItems.slice(0, MAX_THUMBS)
  const overflow = Math.max(0, order.previewItems.length - MAX_THUMBS)

  const handleOrderAgain = async () => {
    if (orderAgainLoading) return
    const lines = collectReorderLinesFromSummary(order)
    if (!lines.length) {
      window.location.assign(againHref)
      return
    }
    setOrderAgainLoading(true)
    setOrderAgainError(undefined)
    try {
      const storeId = order.storeId?.trim() || "default_store"
      const { checkoutHref } = await reorderItemsToCheckout({
        storeId,
        countryCode: readBuyerPreferences(auth.customer).countryCode,
        items: lines,
        customerId: auth.customer?.id ?? null,
      })
      window.location.assign(checkoutHref)
    } catch (error) {
      setOrderAgainError(error instanceof Error ? error.message : "Unable to prepare reorder.")
      setOrderAgainLoading(false)
    }
  }

  const orderAgainButton = (
    <Button
      variant="secondary"
      loading={orderAgainLoading}
      onClick={() => {
        void handleOrderAgain()
      }}
    >
      {orderAgainLoading ? "Preparing…" : "Order again"}
    </Button>
  )

  const runConfirm = async (andReview: boolean) => {
    if (!onConfirmReceipt) return
    setConfirming(true)
    setConfirmationError(undefined)
    try {
      await onConfirmReceipt(order.orderId)
      setConfirmOpen(false)
      if (andReview && order.previewItems[0]?.productId && customerEmail) {
        setOpenReviewAfterConfirm(true)
        setReviewOpen(true)
      } else {
        window.location.reload()
      }
    } catch (error) {
      setConfirmationError(error instanceof Error ? error.message : "Unable to confirm receipt")
    } finally {
      setConfirming(false)
    }
  }

  const submitRefund = async (kind: "return" | "refund") => {
    setRefundSubmitting(kind)
    setRefundError(undefined)
    try {
      await createRefundRequest(order.orderId, {
        reason: kind === "return" ? "Return and refund" : "Refund only",
        note:
          kind === "return"
            ? "Buyer requested return and refund after confirming receipt."
            : "Buyer requested refund only after confirming receipt.",
      })
      onRefundSubmitted?.()
      window.location.reload()
    } catch (error) {
      setRefundError(error instanceof Error ? error.message : "Unable to submit refund request")
      setRefundSubmitting(null)
    }
  }

  const isUnpaid = displayStatus === "unpaid"
  const isPacking = displayStatus === "packing"
  const isAwaitingReceipt = displayStatus === "awaiting_receipt"
  const isReceivedLike = displayStatus === "awaiting_review" || displayStatus === "reviewed"
  const isTerminal = displayStatus === "cancelled" || displayStatus === "completed"

  return (
    <>
      <Card as="article" className="buyer-order-card buyer-order-history-card buyer-order-history-card--temu">
        <header className="buyer-order-history-card-top">
          <a className="buyer-order-history-store" href="/store">
            <span>{storeName}</span>
            <span aria-hidden="true">›</span>
          </a>
          <strong className={`buyer-order-history-status-text${isUnpaid ? " is-unpaid" : ""}`}>{statusLabel}</strong>
        </header>

        <div className="buyer-order-history-card-meta">
          <span>Order time: {formatOrderTime(order.createdAt)}</span>
          <div>
            <strong>{totalLabel}</strong>
            <span>Total {order.itemCount} pcs</span>
          </div>
        </div>

        <div className="buyer-order-history-thumbs">
          {thumbs.length ? (
            thumbs.map((item, index) => (
              <div key={`${order.orderId}-thumb-${index}`} className="buyer-order-history-thumb">
                <OrderPreviewImage thumbnail={item.thumbnail} productId={item.productId} title={item.title} />
              </div>
            ))
          ) : (
            <p className="buyer-order-muted">No preview items</p>
          )}
          {overflow > 0 ? (
            <a className="buyer-order-history-thumb-more" href={detailHref}>
              +{overflow} ›
            </a>
          ) : null}
        </div>

        <footer className="buyer-order-history-card-actions">
          <nav aria-label={`Order ${order.displayId ?? order.orderId} actions`}>
            {isUnpaid ? (
              <>
                {onCancelOrder ? (
                  <Button variant="secondary" onClick={() => onCancelOrder(order.orderId)}>
                    Cancel order
                  </Button>
                ) : (
                  <Button variant="secondary" href={detailHref}>
                    Cancel order
                  </Button>
                )}
                {orderAgainButton}
              </>
            ) : null}

            {isPacking ? (
              <>
                <Button variant="secondary" href={detailHref}>
                  Order details
                </Button>
                {orderAgainButton}
              </>
            ) : null}

            {isAwaitingReceipt ? (
              <>
                {canTrackOrder(order) ? (
                  <Button variant="secondary" href={`/account/orders/${encodeURIComponent(order.orderId)}/tracking`}>
                    View logistic
                  </Button>
                ) : (
                  <Button variant="secondary" href={detailHref}>
                    Order details
                  </Button>
                )}
                {canConfirmReceipt(order) && onConfirmReceipt ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setConfirmOpen(true)
                      setConfirmationError(undefined)
                    }}
                  >
                    Confirm delivery
                  </Button>
                ) : null}
              </>
            ) : null}

            {isReceivedLike ? (
              <>
                {order.reviewEligible && order.previewItems[0]?.productId && customerEmail ? (
                  <Button variant="secondary" onClick={() => setReviewOpen(true)}>
                    Reviews
                  </Button>
                ) : null}
                {canViewReview(order) && viewReviewHref ? (
                  <Button variant="secondary" href={viewReviewHref}>
                    Reviews
                  </Button>
                ) : null}
                {canRequestRefund(order) ? (
                  <Button
                    variant="secondary"
                    disabled={refundSubmitting !== null}
                    onClick={() => void submitRefund("return")}
                  >
                    {refundSubmitting === "return" ? "Submitting…" : "Refund"}
                  </Button>
                ) : null}
                {orderAgainButton}
              </>
            ) : null}

            {isTerminal ? orderAgainButton : null}

            {displayStatus === "refunding" ? (
              <>
                <Button variant="secondary" href={detailHref}>
                  Order details
                </Button>
                {orderAgainButton}
              </>
            ) : null}

            {!isUnpaid &&
            !isPacking &&
            !isAwaitingReceipt &&
            !isReceivedLike &&
            !isTerminal &&
            displayStatus !== "refunding" ? (
              <>
                <Button variant="secondary" href={detailHref}>
                  Order details
                </Button>
                {orderAgainButton}
              </>
            ) : null}
          </nav>
        </footer>
        {refundError ? <p role="alert" className="buyer-order-error">{refundError}</p> : null}
        {orderAgainError ? <p role="alert" className="buyer-order-error">{orderAgainError}</p> : null}
      </Card>

      <ConfirmDeliverySheet
        open={confirmOpen}
        order={order}
        confirming={confirming}
        error={confirmationError}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void runConfirm(false)}
        onConfirmAndReview={() => void runConfirm(true)}
      />

      <OrderReviewDialog
        open={reviewOpen}
        order={order}
        customerEmail={customerEmail}
        customerName={customerName}
        onClose={() => {
          setReviewOpen(false)
          if (openReviewAfterConfirm) window.location.reload()
        }}
        onSubmitted={() => {
          onReviewSubmitted?.()
          window.location.reload()
        }}
      />
    </>
  )
}
