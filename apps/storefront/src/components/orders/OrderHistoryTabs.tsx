const tabs = ["All", "Unpaid", "Shipped", "Delivered", "Reviews", "Returns"]

export function OrderHistoryTabs() {
  return (
    <nav className="buyer-order-history-tabs" aria-label="Order status filters">
      {tabs.map((tab, index) => (
        <button className={index === 0 ? "active" : ""} key={tab} type="button" disabled={index !== 0}>
          {tab}
        </button>
      ))}
    </nav>
  )
}
