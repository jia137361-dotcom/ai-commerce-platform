export type OrderHistoryFilter = {
  key: string
  label: string
  bucket?: string
}

export const orderHistoryFilters: OrderHistoryFilter[] = [
  { key: "all", label: "All" },
  { key: "unpaid", label: "Unpaid", bucket: "unpaid" },
  { key: "packing", label: "Processing", bucket: "packing" },
  { key: "awaiting_receipt", label: "To receive", bucket: "awaiting_receipt" },
  { key: "reviews", label: "Reviews", bucket: "reviews" },
]

export function OrderHistoryTabs({
  activeKey,
  onChange,
}: {
  activeKey: string
  onChange: (filter: OrderHistoryFilter) => void
}) {
  return (
    <nav className="buyer-order-history-tabs" aria-label="Order status filters">
      {orderHistoryFilters.map((filter) => (
        <button className={activeKey === filter.key ? "active" : ""} key={filter.key} type="button" onClick={() => onChange(filter)}>
          {filter.label}
        </button>
      ))}
    </nav>
  )
}
