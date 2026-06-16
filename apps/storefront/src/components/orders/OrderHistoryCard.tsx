import { formatBuyerMoney, type BuyerOrderSummary } from "../../lib/buyer-api"

export function OrderHistoryCard({ order }: { order: BuyerOrderSummary }) {
  return (
    <article className="buyer-order-card buyer-order-history-card">
      <header>
        <div>
          <p className="buyer-order-kicker">Order</p>
          <h2>#{order.displayId ?? order.orderId}</h2>
          <span>{order.createdAt ? new Date(order.createdAt).toLocaleString() : "Date not available"}</span>
        </div>
        <strong>{formatBuyerMoney(order.total ?? undefined, order.currencyCode ?? "USD")}</strong>
      </header>
      <dl className="buyer-order-history-status">
        <div>
          <dt>Payment</dt>
          <dd>{order.paymentStatus ?? "Not available"}</dd>
        </div>
        <div>
          <dt>Fulfillment</dt>
          <dd>{order.fulfillmentStatus ?? "Not available"}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{order.status ?? "Not available"}</dd>
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
          <a href={`/account/orders/${encodeURIComponent(order.orderId)}`}>View order</a>
          <a href={`/account/orders/${encodeURIComponent(order.orderId)}/tracking`}>Track order</a>
        </nav>
      </footer>
    </article>
  )
}
