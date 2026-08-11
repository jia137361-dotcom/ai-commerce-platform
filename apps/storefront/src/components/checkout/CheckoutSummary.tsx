import { formatBuyerMoney } from "../../lib/buyer-api"
import type { StoreCart } from "../../lib/mock-data"
import { CheckoutLineItem } from "./CheckoutLineItem"

type CheckoutSummaryProps = {
  cart: StoreCart
  canPlaceOrder: boolean
  disabledReason: string
  onPlaceOrder?: () => void
  placing?: boolean
  shippingAmount?: number
}

export function CheckoutSummary({
  cart,
  canPlaceOrder,
  disabledReason,
  onPlaceOrder,
  placing = false,
  shippingAmount,
}: CheckoutSummaryProps) {
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0)
  const total = cart.total + (shippingAmount ?? 0)

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
        <div><dt>Shipping</dt><dd>{shippingAmount === undefined ? "Pending" : formatBuyerMoney(shippingAmount, cart.currencyCode)}</dd></div>
        <div><dt>Discount</dt><dd>{formatBuyerMoney(0, cart.currencyCode)}</dd></div>
        <div className="total"><dt>Total</dt><dd>{formatBuyerMoney(total, cart.currencyCode)}</dd></div>
      </dl>
      <button type="button" disabled={!canPlaceOrder || placing} onClick={onPlaceOrder}>
        {placing ? "Placing order..." : "Place Order"}
      </button>
      <p>{canPlaceOrder ? "Checkout bridge is ready for the next confirmation step." : disabledReason}</p>
    </aside>
  )
}
