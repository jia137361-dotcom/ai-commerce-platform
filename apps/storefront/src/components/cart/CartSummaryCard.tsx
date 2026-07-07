import { canCheckoutCart } from "../../lib/buyer-cart"
import type { StoreCart } from "../../lib/mock-data"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import { DisplayMoneyText } from "../ui/DisplayMoneyText"

export function CartSummaryCard({
  cart,
  onCheckout,
  preparing = false,
  checkoutLabel = "Checkout",
}: {
  cart: StoreCart
  onCheckout?: () => void
  preparing?: boolean
  checkoutLabel?: string
}) {
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0)
  const checkoutReady = canCheckoutCart(cart)
  return (
    <Card as="aside" className="buyer-cart-summary-card">
      <header><p>Order summary</p><h2>{itemCount} item{itemCount === 1 ? "" : "s"}</h2></header>
      <dl>
        <div><dt>Subtotal</dt><dd><DisplayMoneyText amount={cart.hasSubtotal === false ? undefined : cart.subtotal} sourceCurrencyCode={cart.currencyCode} /></dd></div>
        <div><dt>Shipping</dt><dd>Calculated at checkout</dd></div>
        <div className="total"><dt>Total</dt><dd><DisplayMoneyText amount={cart.hasTotal === false ? undefined : cart.total} sourceCurrencyCode={cart.currencyCode} /></dd></div>
      </dl>
      {!checkoutReady ? <p className="buyer-cart-summary-warning">Resolve unavailable items or missing prices before checkout.</p> : null}
      <Button href={onCheckout ? undefined : "/checkout"} onClick={onCheckout} disabled={!checkoutReady || preparing}>{preparing ? "Preparing checkout..." : checkoutLabel}</Button>
      <Button variant="ghost" href="/">Continue shopping</Button>
    </Card>
  )
}
