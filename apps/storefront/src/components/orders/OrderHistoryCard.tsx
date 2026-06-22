import { useState } from "react"
import type { BuyerOrderSummary } from "../../lib/buyer-api"
import { authenticatedOrderDetailHref } from "../../pages/orders/order-detail-state"
import { humanizeOrderStatus, paymentStatusPresentation } from "../../pages/orders/order-status"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import { MoneyText } from "../ui/MoneyText"
import { StatusBadge, statusToneFor } from "../ui/StatusBadge"

export function OrderHistoryCard({ order, onConfirmReceipt }: { order: BuyerOrderSummary; onConfirmReceipt?: (orderId: string) => Promise<void> }) {
  const payment = paymentStatusPresentation(order.paymentStatus)
  const [confirming, setConfirming] = useState(false)
  const [confirmationError, setConfirmationError] = useState<string>()
  const confirmReceipt = async () => {
    setConfirming(true)
    setConfirmationError(undefined)
    try {
      if (!onConfirmReceipt) return
      await onConfirmReceipt(order.orderId)
      window.location.reload()
    } catch (error) {
      setConfirmationError(error instanceof Error ? error.message : "Unable to confirm receipt")
      setConfirming(false)
    }
  }
  return (
    <Card as="article" className="buyer-order-card buyer-order-history-card">
      <header>
        <div>
          <p className="buyer-order-kicker">Order</p>
          <h2>#{order.displayId ?? order.orderId}</h2>
          <span>{order.createdAt ? new Date(order.createdAt).toLocaleString() : "Date not available"}</span>
        </div>
        <MoneyText amount={order.total} currencyCode={order.currencyCode} />
      </header>
      <dl className="buyer-order-history-status">
        <div>
          <dt>Payment</dt>
          <dd><StatusBadge tone={payment.tone} title={payment.description}>{payment.label}</StatusBadge></dd>
        </div>
        <div>
          <dt>Fulfillment</dt>
          <dd><StatusBadge tone={statusToneFor(order.fulfillmentStatus)}>{humanizeOrderStatus(order.fulfillmentStatus)}</StatusBadge></dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd><StatusBadge tone={statusToneFor(order.status)}>{humanizeOrderStatus(order.status)}</StatusBadge></dd>
        </div>
      </dl>
      <div className="buyer-order-history-preview">
        {order.previewItems.length ? (
          order.previewItems.map((item, index) => (
            <div key={`${order.orderId}-${index}`} className="buyer-order-history-preview-item">
              <div>
                {item.thumbnail ? <img src={item.thumbnail} alt="" /> : <span>No image</span>}
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
          {order.receiptConfirmationRequired && onConfirmReceipt ? <Button onClick={() => void confirmReceipt()} disabled={confirming}>{confirming ? "Confirming…" : "Confirm delivery"}</Button> : null}
          {order.reviewEligible && order.previewItems[0]?.productId ? <Button variant="secondary" href={`/products/${encodeURIComponent(order.previewItems[0].productId!)}?reviewOrder=${encodeURIComponent(order.displayId ?? order.orderId)}#reviews`}>Write a review</Button> : null}
          <Button href={authenticatedOrderDetailHref(order.orderId)}>View order</Button>
          <Button variant="secondary" href={`/account/orders/${encodeURIComponent(order.orderId)}/tracking`}>Track order</Button>
        </nav>
      </footer>
      {confirmationError ? <p role="alert" className="buyer-order-muted">{confirmationError}</p> : null}
    </Card>
  )
}
