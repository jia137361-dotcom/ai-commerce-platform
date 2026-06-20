import { normalizeBuyerCartItem } from "../../lib/buyer-cart"
import type { StoreCart } from "../../lib/mock-data"
import { MoneyText } from "../ui/MoneyText"
import { StatusBadge } from "../ui/StatusBadge"

export function CheckoutItemList({ cart }: { cart: StoreCart }) {
  return (
    <div className="buyer-checkout-item-list" aria-label="Checkout items">
      {cart.items.map(normalizeBuyerCartItem).map((item) => <article className="buyer-checkout-item" key={item.id}>
        <div className="buyer-checkout-item-image">{item.imageUrl ? <img src={item.imageUrl} alt={item.title} /> : <span>No image</span>}<strong>{item.quantity}</strong></div>
        <div><h3>{item.title}</h3><p>{item.variantLabel ?? "Variant unavailable"}</p><StatusBadge tone={item.isAvailable ? "success" : "warning"}>{item.isAvailable ? "Available" : "Unavailable"}</StatusBadge></div>
        <MoneyText amount={item.lineTotal} currencyCode={cart.currencyCode} unavailableLabel="Price unavailable" />
      </article>)}
    </div>
  )
}
