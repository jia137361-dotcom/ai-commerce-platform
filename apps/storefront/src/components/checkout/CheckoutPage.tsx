import type { StoreCart } from "../../lib/mock-data"
import { formatMoney } from "../../lib/store-api"
import { EmptyState } from "../ui/States"

export function CheckoutPage({ cart }: { cart: StoreCart | null }) {
  return (
    <main className="store-shell checkout-page">
      <div className="page-title-row">
        <div>
          <a className="back-link" href="/cart">Back to cart</a>
          <h1>Checkout</h1>
        </div>
      </div>
      {!cart || !cart.items.length ? (
        <EmptyState title="No cart ready for checkout" message="Add a product before continuing." action={{ label: "Go to store", href: "/store" }} />
      ) : (
        <section className="checkout-layout">
          <form className="checkout-form">
            <section className="checkout-panel">
              <h2>Contact</h2>
              <label>
                Email
                <input placeholder="buyer@example.com" type="email" />
              </label>
            </section>
            <section className="checkout-panel">
              <h2>Delivery address</h2>
              <div className="form-grid">
                <label>First name<input placeholder="Lulu" /></label>
                <label>Last name<input placeholder="Chen" /></label>
                <label className="full">Address<input placeholder="1188 Market Street" /></label>
                <label>City<input placeholder="San Francisco" /></label>
                <label>ZIP<input placeholder="94103" /></label>
              </div>
            </section>
            <section className="checkout-panel">
              <h2>Payment</h2>
              <div className="soft-notice">
                TODO F4: complete the cart with <strong>pp_system_default</strong> after checkout behavior is confirmed.
              </div>
              <a className="primary-button" href={`/checkout/success?cart_id=${encodeURIComponent(cart.id)}`}>Preview success page</a>
            </section>
          </form>
          <aside className="cart-summary">
            <h2>Summary</h2>
            {cart.items.map((item) => (
              <div className="mini-line" key={item.id}>
                <span>{item.title} x {item.quantity}</span>
                <strong>{formatMoney(item.total)}</strong>
              </div>
            ))}
            <div className="line strong"><span>Total</span><strong>{formatMoney(cart.total)}</strong></div>
          </aside>
        </section>
      )}
    </main>
  )
}

export function OrderSuccessPage() {
  const params = new URLSearchParams(window.location.search)
  const orderId = params.get("order_id")
  const cartId = params.get("cart_id")

  return (
    <main className="store-shell success-page">
      <section className="success-panel">
        <span className="success-mark">✓</span>
        <h1>Order path ready</h1>
        <p>The P0 checkout screen is wired to the cart path. Payment completion and real order tracking are intentionally reserved for Phase F4-F5.</p>
        <dl>
          <div><dt>Order ID</dt><dd>{orderId ?? "Not completed yet"}</dd></div>
          <div><dt>Cart ID</dt><dd>{cartId ?? "Not provided"}</dd></div>
        </dl>
        <div className="success-actions">
          <a className="primary-button" href="/store">Continue shopping</a>
          <a className="secondary-button" href="/cart">View cart</a>
        </div>
      </section>
    </main>
  )
}
