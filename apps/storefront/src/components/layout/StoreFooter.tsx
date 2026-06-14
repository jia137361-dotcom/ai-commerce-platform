export function StoreFooter() {
  return (
    <footer className="store-footer">
      <div>
        <strong>Citigoo</strong>
        <p>Defining modern commerce through curated products, reliable fulfillment, and protected checkout.</p>
      </div>
      <nav aria-label="Store footer">
        <a href="/store">Shopping</a>
        <a href="/orders/lookup">Order Tracking</a>
        <a href="/store?tab=about">Shipping & Returns</a>
        <a href="/store?tab=reviews">Reviews</a>
      </nav>
      <form className="newsletter-form">
        <label htmlFor="newsletter-email">Newsletter</label>
        <div>
          <input id="newsletter-email" placeholder="Email address" type="email" />
          <button type="button">Join</button>
        </div>
      </form>
    </footer>
  )
}
