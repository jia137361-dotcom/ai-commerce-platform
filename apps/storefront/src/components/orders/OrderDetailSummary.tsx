import type { BuyerOrderDetail } from "../../lib/buyer-api"
import { Card } from "../ui/Card"
import { MoneyText } from "../ui/MoneyText"
import { paymentStatusPresentation } from "../../pages/orders/order-status"

export function OrderDetailSummary({ order }: { order: BuyerOrderDetail }) {
  const payment = paymentStatusPresentation(order.paymentStatus)
  return (
    <Card as="section" className="buyer-order-card buyer-order-detail-section buyer-order-detail-summary">
      <header>
        <h2>Payment</h2>
      </header>
      <dl>
        <div>
          <dt>Payment method</dt>
          <dd>{payment.label}</dd>
        </div>
        <div>
          <dt>Total item value</dt>
          <dd>
            <MoneyText amount={order.subtotal} currencyCode={order.currencyCode} />
          </dd>
        </div>
        <div>
          <dt>Shipping fee</dt>
          <dd>
            <MoneyText amount={order.shippingTotal} currencyCode={order.currencyCode} />
          </dd>
        </div>
        {order.discountTotal ? (
          <div>
            <dt>Discount</dt>
            <dd>
              <MoneyText amount={order.discountTotal} currencyCode={order.currencyCode} />
            </dd>
          </div>
        ) : null}
        {order.taxTotal ? (
          <div>
            <dt>Tax</dt>
            <dd>
              <MoneyText amount={order.taxTotal} currencyCode={order.currencyCode} />
            </dd>
          </div>
        ) : null}
        <div className="total">
          <dt>Total payment</dt>
          <dd>
            <MoneyText amount={order.total} currencyCode={order.currencyCode} />
          </dd>
        </div>
      </dl>
    </Card>
  )
}
