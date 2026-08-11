import type { SupplierCatalogCategory } from "../../lib/buyer-api"

type MobilePrimaryTabsProps = {
  categories: SupplierCatalogCategory[]
  activeTabId: string
  onTabChange: (tabId: string) => void
}

/** Primary tabs under header — 页面分析 Navigation bar / Homepage mobile */
export function MobilePrimaryTabs({ categories, activeTabId, onTabChange }: MobilePrimaryTabsProps) {
  const tabs = [
    { id: "recommend", label: "Recommend" },
    ...categories.slice(0, 6).map((category) => ({
      id: String(category.id),
      label: category.enName || category.name,
    })),
  ]

  return (
    <nav className="buyer-mhome-primary-tabs" aria-label="Primary categories">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={activeTabId === tab.id ? "active" : ""}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
