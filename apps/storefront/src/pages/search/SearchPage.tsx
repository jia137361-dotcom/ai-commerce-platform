/**
 * Search page — presentation only (页面分析 image86 + Filter image71).
 * Uses published store products, not the raw supplier catalog.
 */
import { useCallback, useEffect, useMemo, useState } from "react"
import { PageShell } from "../../components/layout/PageShell"
import { FilterDrawer, type FilterState } from "../../components/store-home/FilterDrawer"
import { ProductCard } from "../../components/products/ProductCard"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import { fetchProducts } from "../../lib/buyer-api"
import { clearSearchHistory, pushSearchHistory, readSearchHistory, removeSearchHistory } from "../../lib/buyer-search-history"
import { getScopedBuyerStoreId, setActiveBuyerStoreId } from "../../lib/buyer-store-context"
import { useBuyerPageSettings } from "../../lib/useBuyerPageSettings"
import { buildSettingsStoreHref } from "../../lib/storefront-links"
import type { StoreProduct } from "../../lib/mock-data"

type SearchPageProps = { cartCount: number }

export function SearchPage({ cartCount }: SearchPageProps) {
  const [query, setQuery] = useState(() => new URLSearchParams(window.location.search).get("q") ?? "")
  const storeFromQuery = new URLSearchParams(window.location.search).get("store_id") ?? new URLSearchParams(window.location.search).get("store")
  const scopedStoreId = getScopedBuyerStoreId(storeFromQuery)
  const { settings } = useBuyerPageSettings({ storeId: scopedStoreId })
  const storeHref = buildSettingsStoreHref(settings)
  const [debouncedQuery, setDebouncedQuery] = useState(query)
  const [items, setItems] = useState<StoreProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [history, setHistory] = useState<string[]>(() => readSearchHistory())
  const [sort, setSort] = useState("recommended")
  const [filters, setFilters] = useState<FilterState>({})
  const [filterOpen, setFilterOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  useEffect(() => {
    if (storeFromQuery) setActiveBuyerStoreId(storeFromQuery)
  }, [storeFromQuery])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [query])

  const loadResults = useCallback(async (keyword: string, isActive: () => boolean) => {
    setLoading(true)
    setError(undefined)
    const result = await fetchProducts()
    if (!isActive()) return
    const query = keyword.trim().toLowerCase()
    setItems(query ? result.data.filter((item) =>
      [item.title, item.description, item.category].some((value) => value?.toLowerCase().includes(query))
    ) : result.data)
    setError(result.error)
    setLoading(false)
    if (keyword) {
      pushSearchHistory(keyword)
      setHistory(readSearchHistory())
    }
  }, [])

  useEffect(() => {
    let active = true
    void loadResults(debouncedQuery, () => active)
    return () => {
      active = false
    }
  }, [debouncedQuery, loadResults])

  useEffect(() => {
    const params = new URLSearchParams()
    if (debouncedQuery) params.set("q", debouncedQuery)
    if (scopedStoreId) params.set("store_id", scopedStoreId)
    const next = params.toString() ? `/search?${params.toString()}` : "/search"
    if (`${window.location.pathname}${window.location.search}` !== next) {
      window.history.replaceState(window.history.state, "", next)
    }
  }, [debouncedQuery])

  const sortedItems = useMemo(() => {
    let list = [...items]
    if (filters.minPrice != null) {
      list = list.filter((item) => (item.numericPrice ?? 0) >= filters.minPrice!)
    }
    if (filters.maxPrice != null) {
      list = list.filter((item) => (item.numericPrice ?? Number.POSITIVE_INFINITY) <= filters.maxPrice!)
    }
    return list.sort((left, right) => {
      if (sort === "price-asc") {
        return (left.numericPrice ?? Number.POSITIVE_INFINITY) - (right.numericPrice ?? Number.POSITIVE_INFINITY)
      }
      if (sort === "price-desc") {
        return (right.numericPrice ?? Number.NEGATIVE_INFINITY) - (left.numericPrice ?? Number.NEGATIVE_INFINITY)
      }
      return 0
    })
  }, [filters.maxPrice, filters.minPrice, items, sort])

  const activeFilterCount = [
    filters.minPrice,
    filters.maxPrice,
    filters.shipsFrom,
    filters.color,
    filters.material,
    filters.size,
    filters.occasion,
  ].filter((value) => value !== undefined && value !== "").length

  const sortLabel =
    sort === "price-asc"
      ? "Price low to high"
      : sort === "price-desc"
        ? "Price high to low"
        : sort === "top-sales"
          ? "Top sales"
          : sort === "recent"
            ? "Most recent"
            : "Sort by"

  return (
    <PageShell
      className="buyer-store-page buyer-search-page"
      contentClassName="buyer-search-shell buyer-mhome-shell"
      header={
        <StoreTopBar
          settings={settings}
          cartCount={cartCount}
          showMobileSearch
          searchValue={query}
          onSearchChange={setQuery}
          onSearchSubmit={() => setDebouncedQuery(query.trim())}
        />
      }
      cartCount={cartCount}
      storeHref={storeHref}
    >
      <div className="buyer-search-mobile-body">
        <div className="buyer-search-filter-chips" aria-label="Filters">
          <button type="button" onClick={() => setFilterOpen(true)}>
            Filters{activeFilterCount ? ` (${activeFilterCount})` : ""}
          </button>
          <button type="button" className={sortOpen ? "active" : ""} onClick={() => setSortOpen((v) => !v)}>
            {sortLabel} ▾
          </button>
          <button type="button" onClick={() => setFilterOpen(true)}>
            Size ▾
          </button>
          <button type="button" onClick={() => setFilterOpen(true)}>
            Color ▾
          </button>
          <button type="button" onClick={() => setFilterOpen(true)}>
            Material ▾
          </button>
        </div>

        {sortOpen ? (
          <div className="buyer-search-sort-menu" role="listbox">
            {[
              { value: "recommended", label: "Relevance" },
              { value: "top-sales", label: "Top sales" },
              { value: "recent", label: "Most recent" },
              { value: "price-asc", label: "Price low to high" },
              { value: "price-desc", label: "Price high to low" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                className={sort === option.value ? "active" : ""}
                onClick={() => {
                  setSort(option.value)
                  setSortOpen(false)
                }}
              >
                {option.label}
                {sort === option.value ? " ✓" : ""}
              </button>
            ))}
          </div>
        ) : null}

        {!debouncedQuery && history.length ? (
          <section className="buyer-search-history">
            <header>
              <h2>Recent searches</h2>
              <button
                type="button"
                onClick={() => {
                  clearSearchHistory()
                  setHistory([])
                }}
              >
                Clear
              </button>
            </header>
            <ul>
              {history.map((term) => (
                <li key={term}>
                  <button
                    type="button"
                    className="buyer-search-history-term"
                    onClick={() => {
                      setQuery(term)
                      setDebouncedQuery(term)
                    }}
                  >
                    {term}
                  </button>
                  <button
                    type="button"
                    className="buyer-search-history-remove"
                    aria-label={`Remove ${term} from recent searches`}
                    onClick={() => setHistory(removeSearchHistory(term))}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <header className="buyer-search-results-header">
          <div>
            <p>{debouncedQuery ? `Results for “${debouncedQuery}”` : "Discover products"}</p>
            <strong>{sortedItems.length} items</strong>
          </div>
          {debouncedQuery ? (
            <button
              type="button"
              onClick={() => {
                setQuery("")
                setDebouncedQuery("")
              }}
            >
              Clear search
            </button>
          ) : null}
        </header>

        {error ? (
          <p className="buyer-mhome-error" role="alert">
            {error}
          </p>
        ) : null}
        {loading ? <p className="buyer-mhome-loading">Searching…</p> : null}

        {!loading ? (
          <section className="buyer-mhome-grid" aria-label="Search results">
            {sortedItems.map((item) => (
              <ProductCard
                key={item.id}
                product={item}
              />
            ))}
          </section>
        ) : null}

        {!loading && !sortedItems.length ? <p className="buyer-mhome-empty">No products matched.</p> : null}
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
