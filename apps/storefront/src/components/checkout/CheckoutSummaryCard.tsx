import type { StoreCart } from "../../lib/mock-data"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import { DisplayMoneyText } from "../ui/DisplayMoneyText"
import { CheckoutItemList } from "./CheckoutItemList"

type CheckoutSummaryCardProps = {
  cart: StoreCart
  canPlaceOrder: boolean
  onPlaceOrder: () => void
  placing: boolean
  shippingAmount?: number
  showPlaceOrder?: boolean
}

export function CheckoutSummaryCard({
  cart,
  canPlaceOrder,
  onPlaceOrder,
  placing,
  shippingAmount,
  showPlaceOrder = true,
}: CheckoutSummaryCardProps) {
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0)
  const address = cart.shippingAddress
  const itemSubtotal = cart.items.reduce((sum, item) => sum + (item.hasTotal === false ? 0 : item.total), 0)
  const subtotal = cart.items.length ? itemSubtotal : cart.subtotal
  const total = shippingAmount == null ? subtotal : subtotal + shippingAmount
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
        <div><dt>Subtotal</dt><dd><DisplayMoneyText amount={cart.hasSubtotal === false ? undefined : subtotal} sourceCurrencyCode={cart.currencyCode} /></dd></div>
        <div><dt>Shipping</dt><dd>{shippingAmount == null ? "Pending" : <DisplayMoneyText amount={shippingAmount} sourceCurrencyCode={cart.currencyCode} />}</dd></div>
        <div className="total"><dt>Total</dt><dd><DisplayMoneyText amount={cart.hasTotal === false ? undefined : total} sourceCurrencyCode={cart.currencyCode} /></dd></div>
      </dl>
      {showPlaceOrder ? (
        <Button loading={placing} disabled={!canPlaceOrder || placing} onClick={onPlaceOrder}>{placing ? "Placing order..." : "Place order"}</Button>
      ) : null}
      <Button variant="ghost" href="/cart">Back to cart</Button>
    </Card>
  )
}
