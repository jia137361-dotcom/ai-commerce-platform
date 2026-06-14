import type { StoreCart } from "../../lib/mock-data"
import { formatMoney } from "../../lib/store-api"
import { EmptyState, ErrorState, LoadingState } from "../ui/States"

type CartPageProps = {
  cart: StoreCart | null
  loading: boolean
  error?: string
  onRefresh: () => void
  onUpdateQuantity: (lineId: string, quantity: number) => Promise<void>
  onRemove: (lineId: string) => Promise<void>
}

export function CartPage({ cart, loading, error, onRefresh, onUpdateQuantity, onRemove }: CartPageProps) {
  if (loading) return <LoadingState label="Loading cart..." />

  return (
    <main className="store-shell cart-page">
      <div className="page-title-row">
        <div>
          <a className="back-link" href="/store">Continue shopping</a>
          <h1>Cart</h1>
        </div>
        <button className="secondary-button" type="button" onClick={onRefresh}>Refresh</button>
      </div>
      {error && <ErrorState title="Cart is not fully available" message={error} />}
      {!cart || !cart.items.length ? (
        <EmptyState title="Your cart is empty" message="Find a product you love and add it to your cart." action={{ label: "Shop products", href: "/store" }} />
      ) : (
        <section className="cart-layout">
          <div className="cart-lines">
            {cart.items.map((item) => (
              <article className="cart-line" key={item.id}>
                <div className="cart-line-image">
                  {item.imageUrl ? <img src={item.imageUrl} alt={item.title} /> : <span>CG</span>}
                </div>
                <div>
                  <h2>{item.title}</h2>
                  <CartLineSpecs item={item} />
                  <strong>{formatMoney(item.unitPrice)}</strong>
                </div>
                <div className="quantity-control">
                  <button type="button" onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}>-</button>
                  <strong>{item.quantity}</strong>
                  <button type="button" onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}>+</button>
                </div>
                <div className="cart-line-total">
                  <strong>{formatMoney(item.total)}</strong>
                  <button className="secondary-button" type="button" onClick={() => onRemove(item.id)}>Remove</button>
                </div>
              </article>
            ))}
          </div>
          <CartSummary cart={cart} />
        </section>
      )}
    </main>
  )
}

function CartLineSpecs({ item }: { item: StoreCart["items"][number] }) {
  const selectedOptions = item.selectedOptions ?? []
  const color = item.colorName ?? selectedOptions.find((option) => option.name.toLowerCase() === "color")?.value ?? "Default"
  const size = item.sizeName ?? selectedOptions.find((option) => option.name.toLowerCase() === "size")?.value ?? "Default"
  const optionVariant = selectedOptions.map((option) => option.value).join(" / ")
  const variant = item.variantTitle ?? (optionVariant || "Default")

  return (
    <div className="cart-line-specs">
      <span>Color: {color}</span>
      <span>Size: {size}</span>
      <span>Variant: {variant}</span>
    </div>
  )
}

export function CartSummary({ cart }: { cart: StoreCart }) {
  return (
    <aside className="cart-summary">
      <h2>Order summary</h2>
      <div className="line"><span>Subtotal</span><strong>{formatMoney(cart.subtotal)}</strong></div>
      <div className="line"><span>Shipping</span><strong>Calculated later</strong></div>
      <div className="line strong"><span>Total</span><strong>{formatMoney(cart.total)}</strong></div>
      <a className="primary-button" href="/checkout">Checkout</a>
      <p>Payment completion is intentionally held for a later phase. This page validates product and cart basics first.</p>
    </aside>
  )
}
