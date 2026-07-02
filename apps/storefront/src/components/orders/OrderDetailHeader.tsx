import type { BuyerOrderDetail } from "../../lib/buyer-api"
import { humanizeOrderStatus, paymentStatusPresentation } from "../../pages/orders/order-status"
import { Card } from "../ui/Card"
import { StatusBadge, statusToneFor } from "../ui/StatusBadge"

const formatDate = (value?: string | null) => {
  if (!value) return "Not available"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

export function OrderDetailHeader({ order }: { order: BuyerOrderDetail }) {
  const payment = paymentStatusPresentation(order.paymentStatus)
  return (
    <Card as="section" className="buyer-order-card buyer-order-detail-header">
      <div>
        <p className="buyer-order-kicker">Order detail</p>
        <h1>Order {order.displayId ? `#${order.displayId}` : order.orderId}</h1>
        <p>Placed {formatDate(order.createdAt)}</p>
      </div>
      <dl className="buyer-order-status-pills">
        <div>
          <dt>Status</dt>
          <dd><StatusBadge tone={statusToneFor(order.status)}>{humanizeOrderStatus(order.status)}</StatusBadge></dd>
        </div>
        <div>
          <dt>Payment</dt>
          <dd><StatusBadge tone={payment.tone} title={payment.description}>{payment.label}</StatusBadge></dd>
        </div>
        <div>
          <dt>Fulfillment</dt>
          <dd><StatusBadge tone={statusToneFor(order.fulfillmentStatus)}>{humanizeOrderStatus(order.fulfillmentStatus)}</StatusBadge></dd>
        </div>
      </dl>
    </Card>
  )
}
