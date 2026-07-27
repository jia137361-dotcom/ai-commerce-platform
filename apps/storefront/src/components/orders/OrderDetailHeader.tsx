import type { BuyerOrderDetail } from "../../lib/buyer-api"
import { humanizeOrderStatus } from "../../pages/orders/order-status"

const formatDate = (value?: string | null) => {
  if (!value) return "—"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

export function OrderDetailHeader({
  order,
  storeName,
}: {
  order: BuyerOrderDetail
  storeName?: string
}) {
  const fulfillment = humanizeOrderStatus(order.fulfillmentStatus)
  const status = humanizeOrderStatus(order.status)

  return (
    <section className="buyer-order-detail-hero">
      <div className="buyer-order-detail-topline">
        <a className="buyer-order-history-back" href="/account/orders" aria-label="Back to orders">
          ‹
        </a>
        <h1>Order details</h1>
        <span aria-hidden="true" />
      </div>

      <div className="buyer-order-detail-summary-row">
        <div>
          <span className="buyer-order-detail-label">Order No</span>
          <strong>{order.displayId ?? order.orderId}</strong>
        </div>
        <div className="buyer-order-detail-status-block">
          <span aria-hidden="true">⏱</span>
          <div>
            <strong>{status || "In progress"}</strong>
            <small>{fulfillment ? `In ${fulfillment.toLowerCase()}` : "Processing"}</small>
          </div>
        </div>
      </div>

      {storeName ? (
        <a className="buyer-order-detail-shop" href="/store">
          <span className="buyer-order-detail-shop-mark" aria-hidden="true">
            {storeName.slice(0, 1).toUpperCase()}
          </span>
          <span>{storeName}</span>
        </a>
      ) : null}

      <p className="buyer-order-detail-placed">Placed {formatDate(order.createdAt)}</p>
    </section>
  )
}
