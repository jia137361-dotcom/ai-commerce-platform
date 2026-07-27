import { EmptyState } from "../ui/States"

export function OrderHistoryEmptyState({
  title = "You have no related orders",
  message = "Can't find the order? Try View All.",
}: {
  title?: string
  message?: string
}) {
  return (
    <div className="buyer-order-history-empty-wrap">
      <div className="buyer-order-history-empty-art" aria-hidden="true">
        <span>📦</span>
      </div>
      <EmptyState
        className="buyer-order-card buyer-order-history-empty"
        title={title}
        message={message}
        action={{ label: "View all", href: "/account/orders" }}
      />
    </div>
  )
}
