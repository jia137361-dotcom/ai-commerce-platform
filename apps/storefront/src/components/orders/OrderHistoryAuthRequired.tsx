export function OrderHistoryAuthRequired() {
  return (
    <section className="buyer-order-card buyer-order-history-auth">
      <div className="buyer-order-history-icon" aria-hidden="true">□</div>
      <h2>Sign in to view your orders</h2>
      <p>
        Full order history requires a verified buyer account. Guest access is limited to finding one order with its email and display id.
      </p>
      <div>
        <a className="primary" href="/account/sign-in?returnTo=/account/orders">Sign in</a>
        <a href="/orders/lookup">Find an order</a>
        <a href="/">Back to stores</a>
      </div>
    </section>
  )
}
