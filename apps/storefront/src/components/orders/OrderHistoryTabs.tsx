export type OrderHistoryFilter = {
  key: string
  label: string
  status?: string
  paymentStatus?: string
  fulfillmentStatus?: string
}

export const orderHistoryFilters: OrderHistoryFilter[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending", status: "pending" },
  { key: "paid", label: "Paid", paymentStatus: "paid" },
  { key: "waiting", label: "Processing", fulfillmentStatus: "waiting" },
  { key: "shipped", label: "Shipped", fulfillmentStatus: "shipped" },
  { key: "completed", label: "Completed", status: "completed" },
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
