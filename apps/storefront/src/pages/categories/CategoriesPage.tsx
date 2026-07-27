/**
 * Categories page — presentation only (页面分析 image68).
 * Data: same fetchSupplierCatalogCategories + fetchSupplierCatalog as homepage.
 * Does not change API contracts, request shapes, or ensure/design handoff.
 */
import { useCallback, useEffect, useState } from "react"
import { PageShell } from "../../components/layout/PageShell"
import { FilterDrawer, type FilterState } from "../../components/store-home/FilterDrawer"
import { MobileCatalogCard } from "../../components/store-home/MobileCatalogCard"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import {
  ensureSupplierCatalogBlank,
  fetchStoreSettings,
  fetchSupplierCatalog,
  fetchSupplierCatalogCategories,
  type BuyerStoreSettings,
  type SupplierCatalogCategory,
  type SupplierCatalogItem,
} from "../../lib/buyer-api"
import { buildStudioEditorHref } from "../../lib/buyer-design-handoff"
import { navigateBuyer } from "../../lib/buyer-navigate"
import { enterLegacyDefaultStoreContext } from "../../lib/buyer-store-context"

type CategoriesPageProps = { cartCount: number }

const fallbackSettings: BuyerStoreSettings = {
  storeId: "default_store",
  brandName: "Store",
  metadata: {},
}

export function CategoriesPage({ cartCount }: CategoriesPageProps) {
  const [settings, setSettings] = useState<BuyerStoreSettings>(fallbackSettings)
  const [categories, setCategories] = useState<SupplierCatalogCategory[]>([])
  const [activeSideId, setActiveSideId] = useState("featured")
  const [items, setItems] = useState<SupplierCatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [openingId, setOpeningId] = useState<number | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [sort, setSort] = useState("recommended")
  const [filters, setFilters] = useState<FilterState>({})

  useEffect(() => {
    enterLegacyDefaultStoreContext()
    void fetchStoreSettings().then((result) => setSettings(result.data))
  }, [])

  useEffect(() => {
    let active = true
    void fetchSupplierCatalogCategories().then((result) => {
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
    const numericId =
      categoryId !== "featured" && categoryId !== "all" && Number.isFinite(Number(categoryId))
        ? Number(categoryId)
        : null
    // Same catalog API as homepage — only presentation differs
    const result = await fetchSupplierCatalog({
      page: 1,
      perPage: 24,
      categoryId: numericId,
    })
    if (!isActive()) return
    setItems(result.data.items)
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
      label: category.enName || category.name,
    })),
  ]

  const shopByCircles = categories.slice(0, 9)

  const displayItems = (() => {
    let list = [...items]
    if (filters.minPrice != null) {
      list = list.filter((item) => (item.estimatedRetailUsd ?? 0) >= filters.minPrice!)
    }
    if (filters.maxPrice != null) {
      list = list.filter((item) => (item.estimatedRetailUsd ?? Number.POSITIVE_INFINITY) <= filters.maxPrice!)
    }
    if (sort === "price-asc") {
      list.sort(
        (a, b) =>
          (a.estimatedRetailUsd ?? Number.POSITIVE_INFINITY) - (b.estimatedRetailUsd ?? Number.POSITIVE_INFINITY)
      )
    } else if (sort === "price-desc") {
      list.sort(
        (a, b) =>
          (b.estimatedRetailUsd ?? Number.NEGATIVE_INFINITY) - (a.estimatedRetailUsd ?? Number.NEGATIVE_INFINITY)
      )
    }
    return list
  })()

  const openDetail = async (item: SupplierCatalogItem) => {
    if (openingId != null) return
    setOpeningId(item.id)
    try {
      const ensured = await ensureSupplierCatalogBlank({ basicProductId: item.id })
      navigateBuyer(`/products/${encodeURIComponent(ensured.productId)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setOpeningId(null)
    }
  }

  const openDesign = async (item: SupplierCatalogItem) => {
    if (openingId != null) return
    setOpeningId(item.id)
    try {
      const ensured = await ensureSupplierCatalogBlank({ basicProductId: item.id })
      navigateBuyer(buildStudioEditorHref(ensured.productId))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setOpeningId(null)
    }
  }

  return (
    <PageShell
      className="buyer-store-page buyer-categories-page"
      contentClassName="buyer-categories-shell"
      header={<StoreTopBar settings={settings} cartCount={cartCount} />}
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
                    {(category.enName || category.name).slice(0, 1)}
                  </span>
                  <span>{category.enName || category.name}</span>
                </button>
              ))}
              {!shopByCircles.length ? <p className="buyer-categories-empty">No categories yet.</p> : null}
            </div>
          </section>

          <section className="buyer-categories-trending">
            <header>
              <h2>Trending items</h2>
              <button type="button" aria-label="Filters" onClick={() => setFilterOpen(true)}>
                ☰
              </button>
            </header>
            {error ? (
              <p className="buyer-mhome-error" role="alert">
                {error}
              </p>
            ) : null}
            {loading ? <p className="buyer-mhome-loading">Loading…</p> : null}
            {!loading ? (
              <div className="buyer-mhome-grid">
                {displayItems.map((item) => (
                  <MobileCatalogCard
                    key={item.id}
                    item={item}
                    opening={openingId === item.id}
                    onViewDetail={openDetail}
                    onDesignNow={openDesign}
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
