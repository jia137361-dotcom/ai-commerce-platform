import type { BuyerOrderTracking } from "../../lib/buyer-api"

type OrderTrackingHeaderProps = {
  orderId: string
  displayId?: string
  tracking?: BuyerOrderTracking
  backHref: string
  backLabel?: string
}

const valueOrUnavailable = (value: unknown) =>
  typeof value === "string" && value.trim() ? value : "Not available"

export function OrderTrackingHeader({
  orderId,
  displayId,
  tracking,
  backHref,
  backLabel = "Back to order details",
}: OrderTrackingHeaderProps) {
  return (
    <section className="buyer-order-card buyer-order-tracking-header">
      <div>
        <a className="back-link" href={backHref}>
          ← {backLabel}
        </a>
        <h1>Order tracking</h1>
        <p>Order {displayId ? `#${displayId}` : orderId}</p>
      </div>
      <dl className="buyer-order-status-pills">
        <div>
          <dt>Payment</dt>
          <dd className="buyer-order-status-pill">{valueOrUnavailable(tracking?.paymentStatus)}</dd>
        </div>
        <div>
          <dt>Fulfillment</dt>
          <dd className="buyer-order-status-pill">{valueOrUnavailable(tracking?.fulfillmentStatus)}</dd>
        </div>
        <div>
          <dt>Store</dt>
          <dd className="buyer-order-status-pill">{valueOrUnavailable(tracking?.storeId)}</dd>
        </div>
      </dl>
    </section>
  )
}
