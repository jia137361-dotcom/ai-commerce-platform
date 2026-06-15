import { formatBuyerMoney } from "../../lib/buyer-api"
import type { StoreCart } from "../../lib/mock-data"

type CartSummaryProps = {
  cart: StoreCart
}

export function CartSummary({ cart }: CartSummaryProps) {
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0)
  const discount = 0
  const total = cart.total

  return (
    <aside className="buyer-cart-summary">
      <h2>Subtotal ({itemCount} items): <strong>{formatBuyerMoney(cart.subtotal, cart.currencyCode)}</strong></h2>
      <label>
        <input type="checkbox" />
        <span>This order contains a gift</span>
      </label>
      <div className="buyer-cart-summary-lines">
        <div><span>Total Product Price</span><strong>{formatBuyerMoney(cart.subtotal, cart.currencyCode)}</strong></div>
        <div><span>Shop Discounts</span><strong>- {formatBuyerMoney(discount, cart.currencyCode)}</strong></div>
        <div><span>Platform Discounts</span><strong>- {formatBuyerMoney(0, cart.currencyCode)}</strong></div>
      </div>
      <div className="buyer-cart-summary-total">
        <span>Total Discount {formatBuyerMoney(discount, cart.currencyCode)}</span>
        <strong>Total {formatBuyerMoney(total, cart.currencyCode)}</strong>
      </div>
      <a href="/checkout">Proceed to checkout</a>
    </aside>
  )
}
