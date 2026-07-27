import type { SupplierCatalogCategory } from "../../lib/buyer-api"

type CategoryCircleRowProps = {
  categories: SupplierCatalogCategory[]
  activeCategoryId: string
  onCategoryChange: (categoryId: string) => void
}

const POD_LABELS = ["All", "T-Shirt", "Hoodie", "Mug", "Phone Case", "Poster", "Canvas"]

export function CategoryCircleRow({ categories, activeCategoryId, onCategoryChange }: CategoryCircleRowProps) {
  const chips =
    categories.length > 0
      ? [{ id: "all", label: "All" }, ...categories.slice(0, 6).map((c) => ({ id: String(c.id), label: c.enName || c.name }))]
      : POD_LABELS.map((label, index) => ({ id: index === 0 ? "all" : `pod-${index}`, label }))

  return (
    <nav className="buyer-category-circles" aria-label="Quick categories">
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          className={activeCategoryId === chip.id ? "active" : ""}
          onClick={() => onCategoryChange(chip.id.startsWith("pod-") ? "all" : chip.id)}
        >
          <span className="buyer-category-circle" aria-hidden="true">
            {chip.label.slice(0, 1)}
          </span>
          <span>{chip.label}</span>
        </button>
      ))}
    </nav>
  )
}
