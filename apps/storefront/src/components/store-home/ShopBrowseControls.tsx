import type { BuyerCategory } from "../../lib/buyer-api"

type ShopBrowseControlsProps = {
  categories: BuyerCategory[]
  activeCategoryId: string
  onCategoryChange: (categoryId: string) => void
  query: string
  onQueryChange: (query: string) => void
  sort: string
  onSortChange: (sort: string) => void
  activeSection: "items" | "category" | "reviews" | "about"
  onSectionChange: (section: "items" | "category" | "reviews" | "about") => void
}

export function ShopBrowseControls({ categories, activeCategoryId, onCategoryChange, query, onQueryChange, sort, onSortChange, activeSection, onSectionChange }: ShopBrowseControlsProps) {
  return (
    <section className="buyer-shop-controls" aria-label="Browse products">
      <nav className="buyer-shop-category-tabs" aria-label="Shop sections">
        <button className={activeSection === "items" ? "active" : ""} type="button" onClick={() => { onSectionChange("items"); onCategoryChange("all") }}>All Items</button>
        <button className={activeSection === "category" ? "active" : ""} type="button" onClick={() => onSectionChange("category")}>Category</button>
        <button className={activeSection === "reviews" ? "active" : ""} type="button" onClick={() => onSectionChange("reviews")}>Reviews</button>
        <button className={activeSection === "about" ? "active" : ""} type="button" onClick={() => onSectionChange("about")}>About</button>
      </nav>
      {activeSection === "category" ? <nav className="buyer-shop-real-categories" aria-label="Real product categories">{categories.filter((category) => category.id !== "all").length ? categories.filter((category) => category.id !== "all").map((category) => <button className={activeCategoryId === category.id ? "active" : ""} key={category.id} type="button" onClick={() => onCategoryChange(category.id)}>{category.name}</button>) : <span>No categories yet</span>}</nav> : null}
      {activeSection === "items" || activeSection === "category" ? <div className="buyer-shop-filterbar">
        <label className="buyer-store-search"><span aria-hidden="true">⌕</span><input aria-label="Search products" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search this store" /></label>
        <label className="buyer-shop-sort"><span>Sort by</span><select aria-label="Sort products" value={sort} onChange={(event) => onSortChange(event.target.value)}>
          <option value="recommended">Recommended</option><option value="price-asc">Price low to high</option><option value="price-desc">Price high to low</option><option value="name">Name</option>
        </select></label>
      </div> : null}
    </section>
  )
}
