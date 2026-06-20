import type { BuyerOrderDetail } from "../../lib/buyer-api"
import { Card } from "../ui/Card"
import { MoneyText } from "../ui/MoneyText"

export function OrderDetailSummary({ order }: { order: BuyerOrderDetail }) {
  return (
    <Card as="section" className="buyer-order-card buyer-order-detail-section buyer-order-detail-summary">
      <header>
        <p className="buyer-order-kicker">Payment details</p>
        <h2>Order summary</h2>
      </header>
      <dl>
        <div><dt>Subtotal</dt><dd><MoneyText amount={order.subtotal} currencyCode={order.currencyCode} /></dd></div>
        <div><dt>Shipping</dt><dd><MoneyText amount={order.shippingTotal} currencyCode={order.currencyCode} /></dd></div>
        <div><dt>Discount</dt><dd><MoneyText amount={order.discountTotal} currencyCode={order.currencyCode} /></dd></div>
        <div><dt>Tax</dt><dd><MoneyText amount={order.taxTotal} currencyCode={order.currencyCode} /></dd></div>
        <div className="total"><dt>Total</dt><dd><MoneyText amount={order.total} currencyCode={order.currencyCode} /></dd></div>
      </dl>
    </Card>
  )
}
