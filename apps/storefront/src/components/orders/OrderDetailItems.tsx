import { formatBuyerMoney, type BuyerOrderDetail } from "../../lib/buyer-api"

const readMeta = (metadata: Record<string, unknown> | null | undefined, key: string) => {
  const value = metadata?.[key]
  return typeof value === "string" && value.trim() ? value : undefined
}

const money = (value: number | null | undefined, currency?: string | null) =>
  value == null ? "Not available" : formatBuyerMoney(value, currency ?? undefined)

export function OrderDetailItems({ order }: { order: BuyerOrderDetail }) {
  return (
    <section className="buyer-order-card buyer-order-detail-section">
      <header>
        <p className="buyer-order-kicker">Package contents</p>
        <h2>Items ({order.items.length})</h2>
      </header>
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
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.variantTitle || "Default"}</p>
                  <p>{[color && `Color: ${color}`, size && `Size: ${size}`].filter(Boolean).join(" · ") || "Options not available"}</p>
                </div>
                <div className="buyer-order-detail-price">
                  <strong>{money(item.subtotal, order.currencyCode)}</strong>
                  <span>Qty {item.quantity}</span>
                  <span>{money(item.unitPrice, order.currencyCode)} each</span>
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
