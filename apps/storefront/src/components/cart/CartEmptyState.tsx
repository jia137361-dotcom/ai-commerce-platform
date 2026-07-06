export function CartEmptyState() {
  return (
    <section className="buyer-cart-empty">
      <div>
        <span aria-hidden="true">0</span>
        <h1>Your cart is empty</h1>
        <p>Products you add from stores will appear here.</p>
        <a href="/">Shop products</a>
      </div>
    </section>
  )
}
