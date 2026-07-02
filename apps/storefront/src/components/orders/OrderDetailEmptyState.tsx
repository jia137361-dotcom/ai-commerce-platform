type OrderDetailEmptyStateProps = {
  title: string
  message: string
}

export function OrderDetailEmptyState({ title, message }: OrderDetailEmptyStateProps) {
  return (
    <section className="buyer-order-card buyer-order-empty">
      <h1>{title}</h1>
      <p>{message}</p>
      <div className="buyer-order-empty-actions">
        <a href="/orders/lookup">Search order</a>
        <a href="/store">Back to store</a>
      </div>
    </section>
  )
}
