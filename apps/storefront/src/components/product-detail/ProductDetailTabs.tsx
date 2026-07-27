type ProductDetailTabsProps = {
  active: "item" | "size" | "package" | "review" | "detail" | "recommend"
  onChange: (tab: ProductDetailTabsProps["active"]) => void
}

const TABS: Array<{ id: ProductDetailTabsProps["active"]; label: string }> = [
  { id: "item", label: "Item" },
  { id: "size", label: "Size" },
  { id: "package", label: "Package" },
  { id: "review", label: "Review" },
  { id: "detail", label: "Detail" },
  { id: "recommend", label: "Recommend" },
]

export function ProductDetailTabs({ active, onChange }: ProductDetailTabsProps) {
  return (
    <nav className="buyer-product-anchor-tabs" aria-label="Product sections">
      {TABS.map((tab) => (
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
