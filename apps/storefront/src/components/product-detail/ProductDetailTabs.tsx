type ProductDetailTabsProps = {
  active: "item" | "size" | "package" | "review" | "detail" | "recommend"
  onChange: (tab: ProductDetailTabsProps["active"]) => void
  showSizeGuide?: boolean
}

const TABS: Array<{ id: ProductDetailTabsProps["active"]; label: string }> = [
  { id: "item", label: "Item" },
  { id: "size", label: "Size" },
  { id: "review", label: "Review" },
  { id: "detail", label: "Detail" },
  { id: "recommend", label: "Recommend" },
]

export function ProductDetailTabs({ active, onChange, showSizeGuide = true }: ProductDetailTabsProps) {
  const tabs = showSizeGuide ? TABS : TABS.filter((tab) => tab.id !== "size")
  return (
    <nav className="buyer-product-anchor-tabs" aria-label="Product sections">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={active === tab.id ? "active" : ""}
          onClick={() => {
            onChange(tab.id)
            document.getElementById(`pdp-${tab.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })
          }}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
