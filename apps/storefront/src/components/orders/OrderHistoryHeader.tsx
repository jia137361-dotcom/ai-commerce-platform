export function OrderHistoryHeader({ signedInEmail }: { signedInEmail?: string | null }) {
  return (
    <section className="buyer-order-history-header">
      <div>
        <p className="buyer-order-kicker">Account orders</p>
        <h1>Orders</h1>
        <p>{signedInEmail ? `Showing orders for ${signedInEmail}.` : "Sign in to view your full order history."}</p>
      </div>
    </section>
  )
}
