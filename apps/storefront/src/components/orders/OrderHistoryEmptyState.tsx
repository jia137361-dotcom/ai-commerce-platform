export function OrderHistoryEmptyState({ title = "No orders yet", message = "Orders placed while signed in will appear here." }: { title?: string; message?: string }) {
  return (
    <section className="buyer-order-card buyer-order-history-empty">
      <h2>{title}</h2>
      <p>{message}</p>
      <a href="/store">Continue shopping</a>
    </section>
  )
}
