export type OrderHistoryFilter = {
  key: string
  label: string
  bucket?: string
}

/** Design tabs (页面分析): All / Unpaid / Shipped·Sent / Delivered·Used / Refund / Reviews */
export const orderHistoryFilters: OrderHistoryFilter[] = [
  { key: "all", label: "All" },
  { key: "unpaid", label: "Unpaid", bucket: "unpaid" },
  { key: "packing", label: "Shipped / Sent", bucket: "packing" },
  { key: "awaiting_receipt", label: "Delivered / Used", bucket: "awaiting_receipt" },
  { key: "returns", label: "Refund / After-sales", bucket: "returns" },
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
