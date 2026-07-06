import type { StoreCart } from "../../lib/mock-data"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import { MoneyText } from "../ui/MoneyText"
import { CheckoutItemList } from "./CheckoutItemList"

type CheckoutSummaryCardProps = { cart: StoreCart; canPlaceOrder: boolean; disabledReason: string; onPlaceOrder: () => void; placing: boolean; shippingAmount?: number }

export function CheckoutSummaryCard({ cart, canPlaceOrder, disabledReason, onPlaceOrder, placing, shippingAmount }: CheckoutSummaryCardProps) {
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0)
  const address = cart.shippingAddress
  return (
    <Card as="aside" className="buyer-checkout-summary-card">
      <header><p>Order summary</p><h2>{itemCount} item{itemCount === 1 ? "" : "s"}</h2></header>
      <CheckoutItemList cart={cart} />
      {address ? (
        <section className="buyer-checkout-summary-address">
          <strong>Shipping to</strong>
          <p>{[address.firstName, address.lastName].filter(Boolean).join(" ") || "Receiver"}</p>
          <p>{[address.address1, address.city, address.province, address.countryCode?.toUpperCase()].filter(Boolean).join(", ")}</p>
        </section>
      ) : null}
      <dl>
        <div><dt>Subtotal</dt><dd><MoneyText amount={cart.hasSubtotal === false ? undefined : cart.subtotal} currencyCode={cart.currencyCode} /></dd></div>
        <div><dt>Shipping</dt><dd>{shippingAmount == null ? "Pending" : <MoneyText amount={shippingAmount} currencyCode={cart.currencyCode} />}</dd></div>
        <div className="total"><dt>Total</dt><dd><MoneyText amount={cart.hasTotal === false ? undefined : cart.total} currencyCode={cart.currencyCode} /></dd></div>
      </dl>
      <Button loading={placing} disabled={!canPlaceOrder || placing} onClick={onPlaceOrder}>{placing ? "Placing order..." : "Place order"}</Button>
      <p>{canPlaceOrder ? "Guest checkout is available with a valid contact email. Order creation will authorize payment using the configured local provider." : disabledReason}</p>
      {!canPlaceOrder ? (
        <a className="buyer-checkout-sign-in-link" href="/account/sign-in?returnTo=/checkout">
          Sign in for saved order history
        </a>
      ) : null}
      <Button variant="ghost" href="/cart">Back to cart</Button>
    </Card>
  )
}
