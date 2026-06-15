import type { BuyerCategory } from "../../lib/buyer-api"

type StoreCategoryNavProps = {
  categories: BuyerCategory[]
  activeCategoryId: string
  onCategoryChange: (categoryId: string) => void
  query: string
  onQueryChange: (query: string) => void
}

const featureLinks = [
  "Discover Your Cup",
  "Nespresso Live",
  "Nespresso Machines",
  "Nespresso Deals",
]

const machineMenu = [
  "SPEAKER CASE",
  "BOSE SPEAKER CASE",
  "JBL SPEAKER CASE",
  "JBL SPEAKER SILICONE COVER",
  "SPEAKER MOUNT",
]

export function StoreCategoryNav({
  categories,
  activeCategoryId,
  onCategoryChange,
  query,
  onQueryChange,
}: StoreCategoryNavProps) {
  const visibleCategories = categories.slice(0, 5)

  return (
    <section className="buyer-store-toolbar" aria-label="Store controls">
      <div className="buyer-store-social">
        <button type="button">Follow</button>
        <button type="button" aria-label="Share">⌯</button>
        <button type="button" aria-label="Message">▱</button>
      </div>
      <nav className="buyer-store-feature-nav" aria-label="Featured categories">
        {featureLinks.map((link) => (
          <a key={link} href="/store">{link}</a>
        ))}
        <div className="buyer-store-menu-trigger">
          <button type="button">More⌄</button>
          <div className="buyer-store-menu">
            {machineMenu.map((item, index) => (
              <button className={index === 0 ? "active" : ""} key={item} type="button">
                {item}
              </button>
            ))}
          </div>
        </div>
      </nav>
      <label className="buyer-store-search">
        <span>⌕</span>
        <input
          aria-label="Search products"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search all Nespresso"
        />
      </label>
      <div className="buyer-store-category-row" aria-label="Product categories">
        {visibleCategories.map((category) => (
          <button
            className={activeCategoryId === category.id ? "active" : ""}
            key={category.id}
            type="button"
            onClick={() => onCategoryChange(category.id)}
          >
            {category.name}
          </button>
        ))}
      </div>
    </section>
  )
}
