export function CartEmptyState() {
  return (
    <section className="buyer-cart-empty">
      <div>
        <span aria-hidden="true">0</span>
        <h1>Your cart is empty</h1>
        <p>Designs you order from My Designs show up here for quantity, shipping, and checkout.</p>
        <a href="/my-designs">View My Designs</a>
        <a href="/store">Continue shopping</a>
      </div>
    </section>
  )
}
