/**
 * Categories page — presentation only (页面分析 image68).
 * Data: published store products and product categories.
 */
import { useCallback, useEffect, useState } from "react"
import { PageShell } from "../../components/layout/PageShell"
import { FilterDrawer, type FilterState } from "../../components/store-home/FilterDrawer"
import { ProductCard } from "../../components/products/ProductCard"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import {
  fetchProductCategories,
  fetchProducts,
  fetchStoreSettings,
  type BuyerCategory,
  type BuyerStoreSettings,
} from "../../lib/buyer-api"
import { enterLegacyDefaultStoreContext } from "../../lib/buyer-store-context"
import { buildSettingsStoreHref } from "../../lib/storefront-links"
import type { StoreProduct } from "../../lib/mock-data"

type CategoriesPageProps = { cartCount: number }

const fallbackSettings: BuyerStoreSettings = {
  storeId: "default_store",
  brandName: "Store",
  metadata: {},
}

export function CategoriesPage({ cartCount }: CategoriesPageProps) {
  const [settings, setSettings] = useState<BuyerStoreSettings>(fallbackSettings)
  const [categories, setCategories] = useState<BuyerCategory[]>([])
  const [activeSideId, setActiveSideId] = useState("featured")
  const [items, setItems] = useState<StoreProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [filterOpen, setFilterOpen] = useState(false)
  const [sort, setSort] = useState("recommended")
  const [filters, setFilters] = useState<FilterState>({})

  useEffect(() => {
    enterLegacyDefaultStoreContext()
    void fetchStoreSettings().then((result) => setSettings(result.data))
  }, [])

  useEffect(() => {
    let active = true
    void fetchProductCategories().then((result) => {
      if (!active) return
      setCategories(result.data)
    })
    return () => {
      active = false
    }
  }, [])

  const loadTrending = useCallback(async (categoryId: string, isActive: () => boolean) => {
    setLoading(true)
    setError(undefined)
    const result = await fetchProducts()
    if (!isActive()) return
    setItems(
      categoryId === "featured" || categoryId === "all"
        ? result.data
        : result.data.filter((item) => item.categoryIds?.includes(categoryId))
    )
    setError(result.error)
    setLoading(false)
  }, [])

  useEffect(() => {
    let active = true
    void loadTrending(activeSideId, () => active)
    return () => {
      active = false
    }
  }, [activeSideId, loadTrending])

  const sideItems = [
    { id: "featured", label: "Featured" },
    ...categories.map((category) => ({
      id: String(category.id),
      label: category.name,
    })),
  ]

  const shopByCircles = categories.slice(0, 9)
  const activeCategory = sideItems.find((item) => item.id === activeSideId) ?? sideItems[0]
  const activeCategoryHref =
    activeSideId === "featured" ? "/store" : `/store?category=${encodeURIComponent(activeSideId)}`

  const displayItems = (() => {
    let list = [...items]
    if (filters.minPrice != null) {
      list = list.filter((item) => (item.numericPrice ?? 0) >= filters.minPrice!)
    }
    if (filters.maxPrice != null) {
      list = list.filter((item) => (item.numericPrice ?? Number.POSITIVE_INFINITY) <= filters.maxPrice!)
    }
    if (sort === "price-asc") {
      list.sort(
        (a, b) =>
          (a.numericPrice ?? Number.POSITIVE_INFINITY) - (b.numericPrice ?? Number.POSITIVE_INFINITY)
      )
    } else if (sort === "price-desc") {
      list.sort(
        (a, b) =>
          (b.numericPrice ?? Number.NEGATIVE_INFINITY) - (a.numericPrice ?? Number.NEGATIVE_INFINITY)
      )
    }
    return list
  })()

  const storeHref = buildSettingsStoreHref(settings)

  return (
    <PageShell
      className="buyer-store-page buyer-categories-page"
      contentClassName="buyer-categories-shell"
      header={<StoreTopBar settings={settings} cartCount={cartCount} />}
      cartCount={cartCount}
      storeHref={storeHref}
    >
      <div className="buyer-categories-layout">
        <aside className="buyer-categories-sidebar" aria-label="Categories">
          {sideItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={activeSideId === item.id ? "active" : ""}
              onClick={() => setActiveSideId(item.id)}
            >
              {item.label}
            </button>
          ))}
        </aside>

        <div className="buyer-categories-main">
          <section className="buyer-categories-shop-by">
            <h2>Shop by category</h2>
            <div className="buyer-categories-circle-grid">
              {shopByCircles.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveSideId(String(category.id))}
                >
                  <span className="buyer-categories-circle-thumb" aria-hidden="true">
                    {category.name.slice(0, 1)}
                  </span>
                  <span>{category.name}</span>
                </button>
              ))}
              {!shopByCircles.length ? <p className="buyer-categories-empty">No categories yet.</p> : null}
            </div>
          </section>

          <section className="buyer-categories-trending">
            <header>
              <div>
                <p>{activeCategory?.label ?? "Featured"}</p>
                <h2>Trending items</h2>
              </div>
              <div className="buyer-categories-heading-actions">
                <a href={activeCategoryHref}>View All</a>
                <button type="button" aria-label="Filters" onClick={() => setFilterOpen(true)}>
                  ☰
                </button>
              </div>
            </header>
            <p className="buyer-categories-result-count">{displayItems.length} items</p>
            {error ? (
              <p className="buyer-mhome-error" role="alert">
                {error}
              </p>
            ) : null}
            {loading ? <p className="buyer-mhome-loading">Loading…</p> : null}
            {!loading ? (
              <div className="buyer-mhome-grid">
                {displayItems.map((item) => (
                  <ProductCard
                    key={item.id}
                    product={item}
                  />
                ))}
              </div>
            ) : null}
            {!loading && !displayItems.length ? <p className="buyer-mhome-empty">No trending items.</p> : null}
          </section>
        </div>
      </div>

      {/* Desktop fallback: same data, simpler list */}
      <div className="buyer-categories-desktop-note" hidden>
        {settings.brandName}
      </div>

      <FilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        sort={sort}
        onSortChange={setSort}
        filters={filters}
        onFiltersChange={setFilters}
      />
    </PageShell>
  )
}
