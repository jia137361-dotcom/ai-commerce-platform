/**
 * Search page — presentation only (页面分析 image86 + Filter image71).
 * Uses same fetchSupplierCatalog / ensureSupplierCatalogBlank as before.
 */
import { useCallback, useEffect, useMemo, useState } from "react"
import { PageShell } from "../../components/layout/PageShell"
import { FilterDrawer, type FilterState } from "../../components/store-home/FilterDrawer"
import { MobileCatalogCard } from "../../components/store-home/MobileCatalogCard"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import {
  ensureSupplierCatalogBlank,
  fetchSupplierCatalog,
  type SupplierCatalogItem,
} from "../../lib/buyer-api"
import { buildStudioEditorHref } from "../../lib/buyer-design-handoff"
import { navigateBuyer } from "../../lib/buyer-navigate"
import {
  clearSearchHistory,
  pushSearchHistory,
  readSearchHistory,
  removeSearchHistory,
} from "../../lib/buyer-search-history"
import { enterLegacyDefaultStoreContext } from "../../lib/buyer-store-context"
import { useBuyerPageSettings } from "../../lib/useBuyerPageSettings"

type SearchPageProps = { cartCount: number }

export function SearchPage({ cartCount }: SearchPageProps) {
  const { settings } = useBuyerPageSettings()
  const [query, setQuery] = useState(() => new URLSearchParams(window.location.search).get("q") ?? "")
  const [debouncedQuery, setDebouncedQuery] = useState(query)
  const [items, setItems] = useState<SupplierCatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [history, setHistory] = useState<string[]>(() => readSearchHistory())
  const [sort, setSort] = useState("recommended")
  const [filters, setFilters] = useState<FilterState>({})
  const [filterOpen, setFilterOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [openingId, setOpeningId] = useState<number | null>(null)

  useEffect(() => {
    enterLegacyDefaultStoreContext()
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [query])

  const loadResults = useCallback(async (keyword: string, isActive: () => boolean) => {
    setLoading(true)
    setError(undefined)
    const result = await fetchSupplierCatalog({ keyword, perPage: 48 })
    if (!isActive()) return
    setItems(result.data.items)
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
    const next = params.toString() ? `/search?${params.toString()}` : "/search"
    if (`${window.location.pathname}${window.location.search}` !== next) {
      window.history.replaceState(window.history.state, "", next)
    }
  }, [debouncedQuery])

  const sortedItems = useMemo(() => {
    let list = [...items]
    if (filters.minPrice != null) {
      list = list.filter((item) => (item.estimatedRetailUsd ?? 0) >= filters.minPrice!)
    }
    if (filters.maxPrice != null) {
      list = list.filter((item) => (item.estimatedRetailUsd ?? Number.POSITIVE_INFINITY) <= filters.maxPrice!)
    }
    return list.sort((left, right) => {
      if (sort === "price-asc") {
        return (left.estimatedRetailUsd ?? Number.POSITIVE_INFINITY) - (right.estimatedRetailUsd ?? Number.POSITIVE_INFINITY)
      }
      if (sort === "price-desc") {
        return (right.estimatedRetailUsd ?? Number.NEGATIVE_INFINITY) - (left.estimatedRetailUsd ?? Number.NEGATIVE_INFINITY)
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
              <MobileCatalogCard
                key={item.id}
                item={item}
                opening={openingId === item.id}
                onViewDetail={openDetail}
                onDesignNow={openDesign}
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
