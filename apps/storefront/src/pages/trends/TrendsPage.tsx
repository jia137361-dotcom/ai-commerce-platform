import { useCallback, useEffect, useState } from "react"
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
import { buildStudioEditorHref } from "../../lib/buyer-design-handoff"
import { navigateBuyer } from "../../lib/buyer-navigate"
import { enterLegacyDefaultStoreContext } from "../../lib/buyer-store-context"
import { useBuyerPageSettings } from "../../lib/useBuyerPageSettings"
import { buildSettingsStoreHref } from "../../lib/storefront-links"

type TrendsPageProps = { cartCount: number }

const TREND_LABELS = ["Popular now", "New arrivals", "Creator picks", "Gift ideas"]

export function TrendsPage({ cartCount }: TrendsPageProps) {
  const { settings, marketplaceMode } = useBuyerPageSettings()
  const storeHref = buildSettingsStoreHref(settings)
  const [categories, setCategories] = useState<SupplierCatalogCategory[]>([])
  const [activeCategoryId, setActiveCategoryId] = useState("all")
  const [items, setItems] = useState<SupplierCatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [openingId, setOpeningId] = useState<number | null>(null)

  useEffect(() => {
    enterLegacyDefaultStoreContext()
    let active = true
    void fetchSupplierCatalogCategories().then((result) => {
      if (active) setCategories(result.data)
    })
    return () => {
      active = false
    }
  }, [])

  const loadTrends = useCallback(async (categoryId: string, isActive: () => boolean) => {
    setLoading(true)
    setError(undefined)
    const numericId = categoryId !== "all" && Number.isFinite(Number(categoryId)) ? Number(categoryId) : undefined
    const result = await fetchSupplierCatalog({
      page: 1,
      perPage: 32,
      categoryId: numericId,
    })
    if (!isActive()) return
    setItems(result.data.items)
    setError(result.error)
    setLoading(false)
  }, [])

  useEffect(() => {
    let active = true
    void loadTrends(activeCategoryId, () => active)
    return () => {
      active = false
    }
  }, [activeCategoryId, loadTrends])

  const openItem = async (item: SupplierCatalogItem, designNow: boolean) => {
    if (openingId != null) return
    setOpeningId(item.id)
    try {
      const ensured = await ensureSupplierCatalogBlank({ basicProductId: item.id })
      navigateBuyer(
        designNow
          ? buildStudioEditorHref(ensured.productId)
          : `/products/${encodeURIComponent(ensured.productId)}`
      )
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to open this trend.")
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
        <p>Discover what people are creating</p>
        <h1>Trends</h1>
        <span>Browse popular blanks and turn an idea into your own design.</span>
      </section>

      <nav className="buyer-trends-topics" aria-label="Trend topics">
        {TREND_LABELS.map((label, index) => (
          <span key={label} className={index === 0 ? "active" : ""}>
            {label}
          </span>
        ))}
      </nav>

      <section className="buyer-trends-feed">
        <header>
          <div>
            <p>Trending items</p>
            <h2>Made to customize</h2>
          </div>
          <a href="/categories">View categories</a>
        </header>

        <nav className="buyer-trends-categories" aria-label="Trend categories">
          <button
            type="button"
            className={activeCategoryId === "all" ? "active" : ""}
            onClick={() => setActiveCategoryId("all")}
          >
            All
          </button>
          {categories.slice(0, 8).map((category) => (
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
            The live catalog is temporarily unavailable. Please try again shortly.
          </p>
        ) : null}
        {loading ? <p className="buyer-mhome-loading">Loading trends…</p> : null}
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
            <h2>Fresh trends are on the way</h2>
            <p>Explore the product categories while the latest creator picks are being prepared.</p>
            <a href="/categories">Browse categories</a>
          </div>
        ) : null}
      </section>
    </PageShell>
  )
}
