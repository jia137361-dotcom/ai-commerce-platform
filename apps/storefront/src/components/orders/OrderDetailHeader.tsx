import type { BuyerOrderDetail } from "../../lib/buyer-api"

const show = (value?: string | null) => value?.trim() || "Not available"

const formatDate = (value?: string | null) => {
  if (!value) return "Not available"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

export function OrderDetailHeader({ order }: { order: BuyerOrderDetail }) {
  return (
    <section className="buyer-order-card buyer-order-detail-header">
      <div>
        <p className="buyer-order-kicker">Order detail</p>
        <h1>Order {order.displayId ? `#${order.displayId}` : order.orderId}</h1>
        <p>Placed {formatDate(order.createdAt)}</p>
      </div>
      <dl className="buyer-order-status-pills">
        <div>
          <dt>Status</dt>
          <dd className="buyer-order-status-pill">{show(order.status)}</dd>
        </div>
        <div>
          <dt>Payment</dt>
          <dd className="buyer-order-status-pill">{show(order.paymentStatus)}</dd>
        </div>
        <div>
          <dt>Fulfillment</dt>
          <dd className="buyer-order-status-pill">{show(order.fulfillmentStatus)}</dd>
        </div>
      </dl>
    </section>
  )
}
