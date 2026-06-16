type OrderTrackingEmptyStateProps = {
  title: string
  message: string
  actionHref?: string
  actionLabel?: string
}

export function OrderTrackingEmptyState({
  title,
  message,
  actionHref = "/orders/lookup",
  actionLabel = "Search order",
}: OrderTrackingEmptyStateProps) {
  return (
    <section className="buyer-order-card buyer-order-empty">
      <h1>{title}</h1>
      <p>{message}</p>
      <div className="buyer-order-empty-actions">
        <a href={actionHref}>{actionLabel}</a>
        <a href="/store">Back to store</a>
      </div>
    </section>
  )
}
