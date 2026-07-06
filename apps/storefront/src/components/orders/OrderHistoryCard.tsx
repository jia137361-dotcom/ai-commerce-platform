import { useState } from "react"
import { createRefundRequest, type BuyerOrderSummary } from "../../lib/buyer-api"
import {
  buildViewReviewHref,
  buyerOrderDisplayStatusLabel,
  canConfirmReceipt,
  canRequestRefund,
  canViewReview,
  resolveBuyerOrderDisplayStatus,
} from "../../pages/orders/order-history-display"
import { OrderReviewDialog } from "../reviews/OrderReviewDialog"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import { StatusBadge, statusToneFor } from "../ui/StatusBadge"
import { OrderPreviewImage } from "./OrderPreviewImage"

type OrderHistoryCardProps = {
  order: BuyerOrderSummary
  customerEmail?: string | null
  customerName?: string | null
  onConfirmReceipt?: (orderId: string, storeId?: string) => Promise<void>
  onReviewSubmitted?: () => void
  onRefundSubmitted?: () => void
}

const orderHref = (order: BuyerOrderSummary, suffix = "") => {
  const params = new URLSearchParams()
  if (order.storeId) params.set("store", order.storeId)
  const query = params.toString()
  return `/account/orders/${encodeURIComponent(order.orderId)}${suffix}${query ? `?${query}` : ""}`
}

export function OrderHistoryCard({
  order,
  customerEmail,
  customerName,
  onConfirmReceipt,
  onReviewSubmitted,
  onRefundSubmitted,
}: OrderHistoryCardProps) {
  const displayStatus = resolveBuyerOrderDisplayStatus(order)
  const statusLabel = buyerOrderDisplayStatusLabel(displayStatus)
  const [confirming, setConfirming] = useState(false)
  const [confirmationError, setConfirmationError] = useState<string>()
  const [refundError, setRefundError] = useState<string>()
  const [refundSubmitting, setRefundSubmitting] = useState<"return" | "refund" | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const viewReviewHref = buildViewReviewHref(order)

  const confirmReceipt = async () => {
    setConfirming(true)
    setConfirmationError(undefined)
    try {
      if (!onConfirmReceipt) return
      await onConfirmReceipt(order.orderId, order.storeId ?? undefined)
      window.location.reload()
    } catch (error) {
      setConfirmationError(error instanceof Error ? error.message : "Unable to confirm receipt")
      setConfirming(false)
    }
  }

  const submitRefund = async (kind: "return" | "refund") => {
    setRefundSubmitting(kind)
    setRefundError(undefined)
    try {
      await createRefundRequest(order.orderId, {
        reason: kind === "return" ? "Return and refund" : "Refund only",
        note: kind === "return" ? "Buyer requested return and refund after confirming receipt." : "Buyer requested refund only after confirming receipt.",
      })
      onRefundSubmitted?.()
      window.location.reload()
    } catch (error) {
      setRefundError(error instanceof Error ? error.message : "Unable to submit refund request")
      setRefundSubmitting(null)
    }
  }

  return (
    <>
      <Card as="article" className="buyer-order-card buyer-order-history-card">
        <header>
          <div>
            <p className="buyer-order-kicker">Order</p>
            <h2>#{order.displayId ?? order.orderId}</h2>
            <span>{order.createdAt ? new Date(order.createdAt).toLocaleString() : "Date not available"}</span>
          </div>
          <StatusBadge tone={statusToneFor(displayStatus)}>{statusLabel}</StatusBadge>
        </header>
        <div className="buyer-order-history-preview">
          {order.previewItems.length ? (
            order.previewItems.map((item, index) => (
              <div key={`${order.orderId}-${index}`} className="buyer-order-history-preview-item">
                <div>
                  <OrderPreviewImage thumbnail={item.thumbnail} productId={item.productId} title={item.title} />
                </div>
                <p>{item.title}</p>
                <strong>x{item.quantity}</strong>
              </div>
            ))
          ) : (
            <p className="buyer-order-muted">No preview items returned.</p>
          )}
        </div>
        <footer>
          <span>{order.itemCount} item{order.itemCount === 1 ? "" : "s"}</span>
          <nav aria-label={`Order ${order.displayId ?? order.orderId} actions`}>
            <Button variant="secondary" href={orderHref(order)}>
              View details
            </Button>
            {canConfirmReceipt(order) && onConfirmReceipt ? (
              <Button onClick={() => void confirmReceipt()} disabled={confirming}>
                {confirming ? "Confirming…" : "Confirm delivery"}
              </Button>
            ) : null}
            {order.reviewEligible && order.previewItems[0]?.productId && customerEmail ? (
              <Button variant="secondary" onClick={() => setReviewOpen(true)}>
                Write a review
              </Button>
            ) : null}
            {canViewReview(order) && viewReviewHref ? (
              <Button variant="secondary" href={viewReviewHref}>
                View review
              </Button>
            ) : null}
            {canRequestRefund(order) ? (
              <>
                <Button variant="secondary" disabled={refundSubmitting !== null} onClick={() => void submitRefund("return")}>
                  {refundSubmitting === "return" ? "Submitting…" : "Return & refund"}
                </Button>
                <Button variant="ghost" disabled={refundSubmitting !== null} onClick={() => void submitRefund("refund")}>
                  {refundSubmitting === "refund" ? "Submitting…" : "Refund only"}
                </Button>
              </>
            ) : null}
          </nav>
        </footer>
        {confirmationError ? <p role="alert" className="buyer-order-muted">{confirmationError}</p> : null}
        {refundError ? <p role="alert" className="buyer-order-error">{refundError}</p> : null}
      </Card>
      <OrderReviewDialog
        open={reviewOpen}
        order={order}
        customerEmail={customerEmail}
        customerName={customerName}
        onClose={() => setReviewOpen(false)}
        onSubmitted={onReviewSubmitted}
      />
    </>
  )
}
