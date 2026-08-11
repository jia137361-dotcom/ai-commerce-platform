import { formatBuyerMoney, type BuyerOrderDetail } from "../../lib/buyer-api"

const readMeta = (metadata: Record<string, unknown> | null | undefined, key: string) => {
  const value = metadata?.[key]
  return typeof value === "string" && value.trim() ? value : undefined
}

const money = (value: number | null | undefined, currency?: string | null) =>
  value == null ? "—" : formatBuyerMoney(value, currency ?? undefined)

export function OrderDetailItems({ order }: { order: BuyerOrderDetail }) {
  return (
    <section className="buyer-order-card buyer-order-detail-section buyer-order-detail-items-card">
      {order.items.length ? (
        <div className="buyer-order-detail-items">
          {order.items.map((item) => {
            const color = readMeta(item.metadata, "color_name") ?? readMeta(item.metadata, "color")
            const size = readMeta(item.metadata, "size_name") ?? readMeta(item.metadata, "size")
            return (
              <article className="buyer-order-detail-item" key={item.id}>
                <div className="buyer-order-detail-thumb">
                  {item.thumbnail ? <img src={item.thumbnail} alt="" /> : <span>No image</span>}
                </div>
                <div className="buyer-order-detail-item-copy">
                  <h3>{item.title}</h3>
                  <p>Quantity: {item.quantity}</p>
                  {(color || size) && (
                    <p>{[color && `Color: ${color}`, size && `Size: ${size}`].filter(Boolean).join(" · ")}</p>
                  )}
                </div>
                <div className="buyer-order-detail-price">
                  <strong>{money(item.subtotal ?? item.unitPrice, order.currencyCode)}</strong>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <p className="buyer-order-muted">No line items were returned by the order detail API.</p>
      )}
    </section>
  )
}
