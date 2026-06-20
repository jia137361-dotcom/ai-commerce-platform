import type { BuyerOrderSummary } from "../../lib/buyer-api"
import { authenticatedOrderDetailHref } from "../../pages/orders/order-detail-state"
import { humanizeOrderStatus, paymentStatusPresentation } from "../../pages/orders/order-status"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import { MoneyText } from "../ui/MoneyText"
import { StatusBadge, statusToneFor } from "../ui/StatusBadge"

export function OrderHistoryCard({ order }: { order: BuyerOrderSummary }) {
  const payment = paymentStatusPresentation(order.paymentStatus)
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
          <Button href={authenticatedOrderDetailHref(order.orderId)}>View order</Button>
          <Button variant="secondary" href={`/account/orders/${encodeURIComponent(order.orderId)}/tracking`}>Track order</Button>
        </nav>
      </footer>
    </Card>
  )
}
