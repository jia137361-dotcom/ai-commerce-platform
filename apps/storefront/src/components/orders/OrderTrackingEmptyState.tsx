import { Button } from "../ui/Button"
import { Card } from "../ui/Card"

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
    <Card as="section" className="buyer-order-card buyer-order-empty">
      <h1>{title}</h1>
      <p>{message}</p>
      <div className="buyer-order-empty-actions">
        <Button href={actionHref}>{actionLabel}</Button>
        <Button variant="secondary" href="/">Back to stores</Button>
      </div>
    </Card>
  )
}
