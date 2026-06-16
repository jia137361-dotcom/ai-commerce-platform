export function OrderHistoryHeader() {
  return (
    <section className="buyer-order-history-header">
      <div>
        <p className="buyer-order-kicker">Account orders</p>
        <h1>Orders</h1>
        <p>Sign in will be required before this page can show your full order history.</p>
      </div>
      <a href="/orders/lookup">Find an order</a>
    </section>
  )
}
