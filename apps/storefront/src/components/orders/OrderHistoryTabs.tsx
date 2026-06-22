export type OrderHistoryFilter = {
  key: string
  label: string
  status?: string
  paymentStatus?: string
  fulfillmentStatus?: string
  bucket?: string
}

export const orderHistoryFilters: OrderHistoryFilter[] = [
  { key: "all", label: "All" },
  { key: "unpaid", label: "Unpaid", bucket: "unpaid" },
  { key: "processing", label: "Processing", bucket: "processing" },
  { key: "shipped", label: "Shipped", bucket: "shipped" },
  { key: "delivered", label: "Delivered", bucket: "delivered" },
  { key: "reviews", label: "Reviews", bucket: "reviews" },
  { key: "returns", label: "Returns", bucket: "returns" },
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
