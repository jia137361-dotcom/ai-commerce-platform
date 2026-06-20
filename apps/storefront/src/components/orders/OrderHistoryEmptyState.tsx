import { EmptyState } from "../ui/States"

export function OrderHistoryEmptyState({ title = "No orders yet", message = "Orders placed while signed in will appear here." }: { title?: string; message?: string }) {
  return (
    <EmptyState
      className="buyer-order-card buyer-order-history-empty"
      title={title}
      message={message}
      action={{ label: "Continue shopping", href: "/store" }}
    />
  )
}
