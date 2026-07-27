import type { SupplierCatalogCategory } from "../../lib/buyer-api"

type MobileCircleCategoriesProps = {
  categories: SupplierCatalogCategory[]
  activeCircleId: string
  onCircleChange: (circleId: string) => void
}

/**
 * Circle row under search — 页面分析: All + secondary dirs; cancel Deals.
 */
export function MobileCircleCategories({
  categories,
  activeCircleId,
  onCircleChange,
}: MobileCircleCategoriesProps) {
  const circles = [
    { id: "all", label: "All", imageUrl: undefined as string | undefined },
    ...categories.slice(0, 8).map((category) => ({
      id: String(category.id),
      label: category.enName || category.name,
      imageUrl: undefined as string | undefined,
    })),
  ]

  return (
    <nav className="buyer-mhome-circles" aria-label="Sub categories">
      {circles.map((circle) => (
        <button
          key={circle.id}
          type="button"
          className={activeCircleId === circle.id ? "active" : ""}
          onClick={() => onCircleChange(circle.id)}
        >
          <span className="buyer-mhome-circle-thumb" aria-hidden="true">
            {circle.imageUrl ? <img src={circle.imageUrl} alt="" /> : <span>{circle.label.slice(0, 1)}</span>}
          </span>
          <span className="buyer-mhome-circle-label">{circle.label}</span>
        </button>
      ))}
    </nav>
  )
}
