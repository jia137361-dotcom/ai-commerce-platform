import type { Order } from "../../lib/mock-data"

type OrderCardProps = {
  order: Order
}

export function OrderCard({ order }: OrderCardProps) {
  const firstItem = order.items[0]

  return (
    <article className="order-card">
      <div className="order-card-head">
        <div>
          <span>{order.date}</span>
          <strong>Order ID: {order.id}</strong>
        </div>
        <a href={`/account/orders/${order.id}`}>Details</a>
      </div>
      <div className="order-store">{order.storeName}</div>
      <div className="order-item-row">
        <img src={firstItem.imageUrl} alt={firstItem.title} />
        <div>
          <h3>{firstItem.title}</h3>
          <p>{firstItem.afterSales}</p>
          <span>{firstItem.price} x {firstItem.quantity}</span>
        </div>
        <div className="order-status">
          <strong>{order.paidStatus}</strong>
          <button type="button">{order.action}</button>
        </div>
      </div>
    </article>
  )
}
