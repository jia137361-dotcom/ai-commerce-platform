export type OrderHistoryFilter = {
  key: string
  label: string
  bucket?: string
}

export const orderHistoryFilters: OrderHistoryFilter[] = [
  { key: "unpaid", label: "Unpaid", bucket: "unpaid" },
  { key: "packing", label: "To ship", bucket: "packing" },
  { key: "awaiting_receipt", label: "To receive", bucket: "awaiting_receipt" },
  { key: "reviews", label: "To review", bucket: "reviews" },
  { key: "returns", label: "Refund / After-sales", bucket: "returns" },
]

export function OrderHistoryTabs({
  activeKey,
  onChange,
}: {
  activeKey: string
  onChange: (filter: OrderHistoryFilter) => void
}) {
  return (
    <nav className="buyer-order-history-tabs buyer-order-history-tabs--grid" aria-label="Order status filters">
      {orderHistoryFilters.map((filter) => (
        <button
          className={activeKey === filter.key ? "active" : ""}
          key={filter.key}
          type="button"
          onClick={() => onChange(filter)}
        >
          {filter.label}
        </button>
      ))}
    </nav>
  )
}
