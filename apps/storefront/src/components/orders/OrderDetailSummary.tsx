import { formatBuyerMoney, type BuyerOrderDetail } from "../../lib/buyer-api"

const money = (value: number | null | undefined, currency?: string | null) =>
  value == null ? "Not available" : formatBuyerMoney(value, currency ?? undefined)

export function OrderDetailSummary({ order }: { order: BuyerOrderDetail }) {
  return (
    <section className="buyer-order-card buyer-order-detail-section buyer-order-detail-summary">
      <header>
        <p className="buyer-order-kicker">Payment details</p>
        <h2>Order summary</h2>
      </header>
      <dl>
        <div><dt>Subtotal</dt><dd>{money(order.subtotal, order.currencyCode)}</dd></div>
        <div><dt>Shipping</dt><dd>{money(order.shippingTotal, order.currencyCode)}</dd></div>
        <div><dt>Discount</dt><dd>{money(order.discountTotal, order.currencyCode)}</dd></div>
        <div><dt>Tax</dt><dd>{money(order.taxTotal, order.currencyCode)}</dd></div>
        <div className="total"><dt>Total</dt><dd>{money(order.total, order.currencyCode)}</dd></div>
      </dl>
    </section>
  )
}
