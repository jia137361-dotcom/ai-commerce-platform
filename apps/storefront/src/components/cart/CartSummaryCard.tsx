import { canCheckoutCart } from "../../lib/buyer-cart"
import type { StoreCart } from "../../lib/mock-data"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import { MoneyText } from "../ui/MoneyText"

export function CartSummaryCard({ cart }: { cart: StoreCart }) {
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0)
  const checkoutReady = canCheckoutCart(cart)
  return (
    <Card as="aside" className="buyer-cart-summary-card">
      <header><p>Order summary</p><h2>{itemCount} item{itemCount === 1 ? "" : "s"}</h2></header>
      <dl>
        <div><dt>Subtotal</dt><dd><MoneyText amount={cart.hasSubtotal === false ? undefined : cart.subtotal} currencyCode={cart.currencyCode} /></dd></div>
        <div><dt>Shipping</dt><dd>Calculated at checkout</dd></div>
        <div className="total"><dt>Total</dt><dd><MoneyText amount={cart.hasTotal === false ? undefined : cart.total} currencyCode={cart.currencyCode} /></dd></div>
      </dl>
      {!checkoutReady ? <p className="buyer-cart-summary-warning">Resolve unavailable items or missing prices before checkout.</p> : null}
      <Button href="/checkout" disabled={!checkoutReady}>Proceed to checkout</Button>
      <Button variant="ghost" href="/store">Continue shopping</Button>
    </Card>
  )
}
