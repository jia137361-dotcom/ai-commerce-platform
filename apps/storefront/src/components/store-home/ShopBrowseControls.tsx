import type { SupplierCatalogCategory } from "../../lib/buyer-api"
import { useBuyerLocale } from "../../lib/locale"

type ShopBrowseControlsProps = {
  categories: SupplierCatalogCategory[]
  activeCategoryId: string
  onCategoryChange: (categoryId: string) => void
  query: string
  onQueryChange: (query: string) => void
  sort: string
  onSortChange: (sort: string) => void
  activeSection: "items" | "reviews" | "about"
  onSectionChange: (section: "items" | "reviews" | "about") => void
}

export function ShopBrowseControls({
  categories,
  activeCategoryId,
  onCategoryChange,
  query,
  onQueryChange,
  sort,
  onSortChange,
  activeSection,
  onSectionChange,
}: ShopBrowseControlsProps) {
  const { t } = useBuyerLocale()
  return (
    <section className="buyer-shop-controls" aria-label={t("catalogTitle")}>
      <nav className="buyer-shop-category-tabs" aria-label="Shop sections">
        <button
          className={activeSection === "items" ? "active" : ""}
          type="button"
          onClick={() => {
            onSectionChange("items")
            onCategoryChange("all")
          }}
        >
          {t("catalogAllItems")}
        </button>
        <button className={activeSection === "reviews" ? "active" : ""} type="button" onClick={() => onSectionChange("reviews")}>
          Reviews
        </button>
        <button className={activeSection === "about" ? "active" : ""} type="button" onClick={() => onSectionChange("about")}>
          About
        </button>
      </nav>

      {activeSection === "items" ? (
        <>
          <nav className="buyer-shop-real-categories" aria-label={t("catalogCategoryFilter")}>
            <button
              className={activeCategoryId === "all" ? "active" : ""}
              type="button"
              onClick={() => onCategoryChange("all")}
            >
              {t("catalogAllItems")}
            </button>
            {categories.length ? (
              categories.map((category) => (
                <button
                  className={activeCategoryId === String(category.id) ? "active" : ""}
                  key={category.id}
                  type="button"
                  onClick={() => onCategoryChange(String(category.id))}
                >
                  {category.enName || category.name}
                </button>
              ))
            ) : null}
          </nav>
          <div className="buyer-shop-filterbar">
            <label className="buyer-store-search">
              <span aria-hidden="true">⌕</span>
              <input
                aria-label={t("catalogSearchPlaceholder")}
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder={t("catalogSearchPlaceholder")}
              />
            </label>
            <label className="buyer-shop-sort">
              <span>Sort by</span>
              <select aria-label="Sort blanks" value={sort} onChange={(event) => onSortChange(event.target.value)}>
                <option value="recommended">Recommended</option>
                <option value="price-asc">Price low to high</option>
                <option value="price-desc">Price high to low</option>
                <option value="name">Name</option>
              </select>
            </label>
          </div>
        </>
      ) : null}
    </section>
  )
}
