import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import { PageShell } from "../../components/layout/PageShell"
import { StoreFooter } from "../../components/layout/StoreFooter"
import { MobileCatalogCard } from "../../components/store-home/MobileCatalogCard"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import {
  ensureSupplierCatalogBlank,
  fetchSupplierCatalog,
  fetchSupplierCatalogCategories,
  type SupplierCatalogCategory,
  type SupplierCatalogItem,
} from "../../lib/buyer-api"
import {
  buildAiDesignHref,
  buildStudioEditorHref,
  peekPendingStudioMaterial,
  takePendingStudioMaterial,
} from "../../lib/buyer-design-handoff"
import { navigateBuyer } from "../../lib/buyer-navigate"
import { enterLegacyDefaultStoreContext } from "../../lib/buyer-store-context"
import { useBuyerPageSettings } from "../../lib/useBuyerPageSettings"
import { buildSettingsStoreHref } from "../../lib/storefront-links"

type TrendsPageProps = { cartCount: number }

const QUICK_TAGS = ["T-shirt", "Hoodie", "Mug", "Poster", "Canvas", "Phone case"]

export function TrendsPage({ cartCount }: TrendsPageProps) {
  const { settings, marketplaceMode } = useBuyerPageSettings()
  const storeHref = buildSettingsStoreHref(settings)
  const [categories, setCategories] = useState<SupplierCatalogCategory[]>([])
  const [activeCategoryId, setActiveCategoryId] = useState("all")
  const [keywordInput, setKeywordInput] = useState("")
  const [keyword, setKeyword] = useState("")
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [items, setItems] = useState<SupplierCatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [openingId, setOpeningId] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [pendingMaterial, setPendingMaterial] = useState(() => peekPendingStudioMaterial())

  useEffect(() => {
    enterLegacyDefaultStoreContext()
    setPendingMaterial(peekPendingStudioMaterial())
    let active = true
    void fetchSupplierCatalogCategories().then((result) => {
      if (active) setCategories(result.data)
    })
    return () => {
      active = false
    }
  }, [])

  const effectiveKeyword = useMemo(() => {
    const fromInput = keyword.trim()
    if (fromInput) return fromInput
    return activeTag?.trim() || ""
  }, [activeTag, keyword])

  const loadCatalog = useCallback(
    async (nextPage: number, append: boolean, isActive: () => boolean) => {
      if (append) setLoadingMore(true)
      else setLoading(true)
      setError(undefined)

      const numericId =
        activeCategoryId !== "all" && Number.isFinite(Number(activeCategoryId))
          ? Number(activeCategoryId)
          : undefined
      const result = await fetchSupplierCatalog({
        page: nextPage,
        perPage: 24,
        categoryId: numericId,
        keyword: effectiveKeyword || undefined,
      })
      if (!isActive()) return

      setItems((current) => (append ? [...current, ...result.data.items] : result.data.items))
      setPage(result.data.page)
      setLastPage(result.data.lastPage)
      setError(result.error)
      setLoading(false)
      setLoadingMore(false)
    },
    [activeCategoryId, effectiveKeyword]
  )

  useEffect(() => {
    let active = true
    void loadCatalog(1, false, () => active)
    return () => {
      active = false
    }
  }, [loadCatalog])

  const categoryTags = useMemo(() => {
    const fromCategories = categories
      .slice(0, 12)
      .map((category) => category.enName || category.name)
      .filter(Boolean)
    return Array.from(new Set([...QUICK_TAGS, ...fromCategories])).slice(0, 16)
  }, [categories])

  const submitSearch = (event?: FormEvent) => {
    event?.preventDefault()
    setActiveTag(null)
    setKeyword(keywordInput.trim())
  }

  const selectTag = (tag: string) => {
    const next = activeTag === tag ? null : tag
    setActiveTag(next)
    setKeywordInput(next ?? "")
    setKeyword("")
  }

  const openItem = async (item: SupplierCatalogItem, designNow: boolean) => {
    if (openingId != null) return
    setOpeningId(item.id)
    try {
      const ensured = await ensureSupplierCatalogBlank({ basicProductId: item.id })
      const pending = designNow ? takePendingStudioMaterial() : null
      if (designNow) setPendingMaterial(null)
      navigateBuyer(
        designNow
          ? buildStudioEditorHref(ensured.productId, pending?.materialId)
          : `/products/${encodeURIComponent(ensured.productId)}`
      )
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to open this product.")
    } finally {
      setOpeningId(null)
    }
  }

  return (
    <PageShell
      className="buyer-store-page buyer-trends-page"
      contentClassName="buyer-trends-shell"
      header={<StoreTopBar settings={settings} cartCount={cartCount} marketplaceMode={marketplaceMode} />}
      footer={<StoreFooter />}
      cartCount={cartCount}
      storeHref={storeHref}
    >
      <section className="buyer-trends-hero">
        <p>Trends</p>
        <h1>Product selection</h1>
        <span>Search blanks by keyword or tag, then customize the one you like.</span>
        <div className="buyer-trends-hero-actions">
          <a className="buyer-ui-button buyer-ui-button--ghost" href={buildAiDesignHref()}>
            AI design
          </a>
        </div>
      </section>

      {pendingMaterial ? (
        <aside className="buyer-studio-pending-material" role="status">
          {pendingMaterial.designImageUrl ? <img src={pendingMaterial.designImageUrl} alt="" /> : null}
          <div>
            <p>Material ready — pick a blank below to continue.</p>
            <small>{pendingMaterial.title || pendingMaterial.prompt || pendingMaterial.materialId}</small>
          </div>
        </aside>
      ) : null}

      <section className="buyer-trends-feed">
        <header>
          <div>
            <p>Catalog</p>
            <h2>Select a product to design</h2>
          </div>
        </header>

        <form className="buyer-trends-search" onSubmit={submitSearch}>
          <input
            type="search"
            value={keywordInput}
            onChange={(event) => setKeywordInput(event.target.value)}
            placeholder="Search by keyword, e.g. hoodie, mug, summer"
            aria-label="Search products by keyword"
          />
          <button type="submit">Search</button>
          {effectiveKeyword || activeCategoryId !== "all" ? (
            <button
              type="button"
              className="buyer-trends-search-clear"
              onClick={() => {
                setKeywordInput("")
                setKeyword("")
                setActiveTag(null)
                setActiveCategoryId("all")
              }}
            >
              Clear
            </button>
          ) : null}
        </form>

        <nav className="buyer-trends-topics" aria-label="Product tags">
          {categoryTags.map((tag) => (
            <button
              key={tag}
              type="button"
              className={activeTag === tag ? "active" : ""}
              onClick={() => selectTag(tag)}
            >
              {tag}
            </button>
          ))}
        </nav>

        <nav className="buyer-trends-categories" aria-label="Product categories">
          <button
            type="button"
            className={activeCategoryId === "all" ? "active" : ""}
            onClick={() => setActiveCategoryId("all")}
          >
            All categories
          </button>
          {categories.slice(0, 10).map((category) => (
            <button
              key={category.id}
              type="button"
              className={activeCategoryId === String(category.id) ? "active" : ""}
              onClick={() => setActiveCategoryId(String(category.id))}
            >
              {category.enName || category.name}
            </button>
          ))}
        </nav>

        {error ? (
          <p className="buyer-mhome-error" role="alert">
            {error}
          </p>
        ) : null}
        {loading ? <p className="buyer-mhome-loading">Loading products…</p> : null}
        {!loading ? (
          <div className="buyer-trends-grid">
            {items.map((item) => (
              <MobileCatalogCard
                key={item.id}
                item={item}
                opening={openingId === item.id}
                onViewDetail={(selected) => void openItem(selected, false)}
                onDesignNow={(selected) => void openItem(selected, true)}
              />
            ))}
          </div>
        ) : null}
        {!loading && !items.length ? (
          <div className="buyer-trends-empty">
            <h2>No matching products</h2>
            <p>Try another keyword, tag, or category.</p>
          </div>
        ) : null}
        {!loading && page < lastPage ? (
          <div className="buyer-mhome-more">
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => void loadCatalog(page + 1, true, () => true)}
            >
              {loadingMore ? "Loading…" : "See more"}
            </button>
          </div>
        ) : null}
      </section>
    </PageShell>
  )
}
