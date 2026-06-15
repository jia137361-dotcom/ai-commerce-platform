import { formatBuyerMoney } from "../../lib/buyer-api"
import type { StoreCart } from "../../lib/mock-data"
import { CheckoutLineItem } from "./CheckoutLineItem"

type CheckoutSummaryProps = {
  cart: StoreCart
}

export function CheckoutSummary({ cart }: CheckoutSummaryProps) {
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <aside className="buyer-checkout-summary">
      <h2>Order summary</h2>
      <div className="buyer-checkout-summary-lines">
        {cart.items.map((item) => (
          <div className="buyer-checkout-line-shell" key={item.id}>
            <CheckoutLineItem item={item} currencyCode={cart.currencyCode} />
          </div>
        ))}
      </div>
      <label className="buyer-checkout-coupon">
        Coupon or discount code
        <div>
          <input placeholder="Enter code" />
          <button type="button">Apply</button>
        </div>
      </label>
      <dl>
        <div><dt>Subtotal ({itemCount} items)</dt><dd>{formatBuyerMoney(cart.subtotal, cart.currencyCode)}</dd></div>
        <div><dt>Shipping</dt><dd>Pending</dd></div>
        <div><dt>Discount</dt><dd>{formatBuyerMoney(0, cart.currencyCode)}</dd></div>
        <div className="total"><dt>Total</dt><dd>{formatBuyerMoney(cart.total, cart.currencyCode)}</dd></div>
      </dl>
      <button type="button" disabled>Checkout backend pending</button>
      <p>Place Order is disabled until address and shipping APIs are available.</p>
    </aside>
  )
}
