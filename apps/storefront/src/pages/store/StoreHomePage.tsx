import { useCallback, useEffect, useMemo, useState } from "react"
import { PageShell } from "../../components/layout/PageShell"
import { SectionHeader } from "../../components/layout/SectionHeader"
import { ShopBrowseControls } from "../../components/store-home/ShopBrowseControls"
import { StoreAboutPanel } from "../../components/store-home/StoreAboutPanel"
import { ShopHero } from "../../components/store-home/ShopHero"
import { StoreIdentity } from "../../components/store-home/StoreIdentity"
import { StoreProductResults } from "../../components/store-home/StoreProductResults"
import { StoreReviewsPanel } from "../../components/store-home/StoreReviewsPanel"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import {
  fetchProductCategories,
  fetchProducts,
  fetchMarketplaceStoreBySlug,
  fetchStoreSettings,
  fetchStoreReviews,
  setActiveBuyerStoreId,
  type BuyerReviewsSummary,
  type BuyerCategory,
  type BuyerStoreSettings,
  type DataSource,
} from "../../lib/buyer-api"
import type { StoreProduct } from "../../lib/mock-data"

type StoreHomePageProps = { cartCount: number; storeSlug?: string }
type Notice = { key: string; message: string }

const buildPendingStoreSettings = (storeSlug?: string): BuyerStoreSettings => ({
  storeId: "",
  brandName: storeSlug ? "Loading store" : "Store",
  galleryUrls: [],
  metadata: {},
})

function StoreFooter({ productsHref = "#products" }: { productsHref?: string }) {
  return (
    <footer className="buyer-store-footer">
      <section><h2>Citigoo</h2><p>Curated products, protected checkout, and reliable order support.</p></section>
      <section><h2>Shopping</h2><a href={productsHref}>All products</a><a href="/cart">Cart</a></section>
      <section><h2>Customer service</h2><a href="/orders/lookup">Find an order</a><a href="/account/orders">Order history</a></section>
      <section><h2>Help</h2><a href="/help">Help Center</a><a href="/help">Contact us</a></section>
      <div className="buyer-store-legal"><span>© 2026 Citigoo Limited</span><a href="/terms">Terms</a><a href="/privacy">Privacy</a></div>
    </footer>
  )
}

export function StoreHomePage({ cartCount, storeSlug }: StoreHomePageProps) {
  const [settings, setSettings] = useState<BuyerStoreSettings>(() => buildPendingStoreSettings(storeSlug))
  const [categories, setCategories] = useState<BuyerCategory[]>([{ id: "all", name: "All items" }])
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [notices, setNotices] = useState<Notice[]>([])
  const [activeCategoryId, setActiveCategoryId] = useState("all")
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState("recommended")
  const [productSource, setProductSource] = useState<DataSource>("backend")
  const [loadVersion, setLoadVersion] = useState(0)
  const [activeSection, setActiveSection] = useState<"items" | "category" | "reviews" | "about">("items")
  const [storeReviews, setStoreReviews] = useState<BuyerReviewsSummary | null>(null)
  const [storeReviewsError, setStoreReviewsError] = useState<string>()

  const loadStore = useCallback(async (isActive: () => boolean, storeId: string) => {
    setLoading(true)
    const [settingsResult, categoriesResult, productsResult, reviewsResult] = await Promise.all([
      fetchStoreSettings({ storeId }),
      fetchProductCategories({ storeId }),
      fetchProducts({ storeId }),
      fetchStoreReviews({ storeId }),
    ])

    if (!isActive()) return

    setSettings(settingsResult.data)
    setCategories(categoriesResult.data)
    setProducts(productsResult.data)
    setProductSource(productsResult.source)
    setStoreReviews(reviewsResult.data)
    setStoreReviewsError(reviewsResult.error)
    setNotices(
      [settingsResult, categoriesResult, productsResult, reviewsResult]
        .filter((result) => result.error)
        .map((result, index) => ({
          key: `${result.source}-${index}-${result.error}`,
          message: `${result.source === "mock" ? "Mock data" : "Static UI"} fallback: ${result.error}`,
        }))
    )
    setLoading(false)
  }, [])

  useEffect(() => {
    let active = true
    const boot = async () => {
      setLoading(true)
      setSettings(buildPendingStoreSettings(storeSlug))
      setCategories([{ id: "all", name: "All items" }])
      setProducts([])
      setStoreReviews(null)
      setStoreReviewsError(undefined)
      setNotices([])
      if (!storeSlug) {
        setLoading(false)
        setNotices([{ key: "store-route-missing", message: "Choose a store from the marketplace." }])
        return
      }

      const storeResult = await fetchMarketplaceStoreBySlug(storeSlug)
      if (!active) return
      if (!storeResult.data) {
        setLoading(false)
        setNotices([{ key: "store-missing", message: storeResult.error ?? "Store not found" }])
        return
      }
      const storeId = storeResult.data.storeId
      setActiveBuyerStoreId(storeId)
      await loadStore(() => active, storeId)
    }
    void boot()
    return () => {
      active = false
    }
  }, [loadStore, loadVersion, storeSlug])

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab")
    if (!tab) return
    if (tab === "about") setActiveSection("about")
    if (tab === "reviews") setActiveSection("reviews")
    if (tab === "category") setActiveSection("category")
    const targetId = tab === "category" ? "products" : tab
    window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }, [loadVersion])

  const visibleCategories = useMemo(() => {
    const usedIds = new Set(products.flatMap((product) => product.categoryIds ?? []))
    const all = categories.find((category) => category.id === "all") ?? { id: "all", name: "All items" }
    const relevant = categories.filter((category) => category.id !== "all" && usedIds.has(category.id))
    const available = relevant.length ? relevant : categories.filter((category) => category.id !== "all")
    return [all, ...available.slice(0, 7)]
  }, [categories, products])

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const selectedCategory = categories.find((category) => category.id === activeCategoryId)
    const result = products.filter((product) => {
      const categoryMatch = activeCategoryId === "all" ||
        product.categoryIds?.includes(activeCategoryId) ||
        product.category.toLowerCase() === selectedCategory?.name.toLowerCase()
      const queryMatch = !normalizedQuery ||
        `${product.title} ${product.description ?? ""} ${product.category}`.toLowerCase().includes(normalizedQuery)
      return categoryMatch && queryMatch
    })

    return [...result].sort((left, right) => {
      if (sort === "price-asc") return (left.numericPrice ?? Number.POSITIVE_INFINITY) - (right.numericPrice ?? Number.POSITIVE_INFINITY)
      if (sort === "price-desc") return (right.numericPrice ?? Number.NEGATIVE_INFINITY) - (left.numericPrice ?? Number.NEGATIVE_INFINITY)
      if (sort === "name") return left.title.localeCompare(right.title)
      return 0
    })
  }, [activeCategoryId, categories, products, query, sort])

  const heroImage = settings.bannerUrl
  const hasFilters = activeCategoryId !== "all" || Boolean(query.trim())
  const productError = productSource === "mock" ? notices.find((notice) => notice.message.startsWith("Mock data"))?.message : undefined

  return (
    <PageShell
      className="buyer-store-page"
      contentClassName="buyer-shop-shell-content"
      header={<StoreTopBar settings={settings} cartCount={cartCount} />}
      footer={<StoreFooter productsHref="#products" />}
    >
      <ShopHero brandName={settings.brandName} imageUrl={heroImage} isFallback={!settings.bannerUrl} announcement={settings.announcement} description={settings.description} collectionHref="#products" />
      <StoreIdentity settings={settings} />
      <ShopBrowseControls
        categories={visibleCategories}
        activeCategoryId={activeCategoryId}
        onCategoryChange={setActiveCategoryId}
        query={query}
        onQueryChange={setQuery}
        sort={sort}
        onSortChange={setSort}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      {notices.length ? (
        <aside className="buyer-store-fallback" role="status" aria-label="Fallback data notice">
          {notices.map((notice) => <p key={notice.key}>{notice.message}</p>)}
        </aside>
      ) : null}

      {activeSection === "items" || activeSection === "category" ? <section className="buyer-shop-products" id="products">
        <SectionHeader
          eyebrow={activeCategoryId === "all" ? "Store collection" : "Selected category"}
          title={activeCategoryId === "all" ? "Latest drops" : visibleCategories.find((category) => category.id === activeCategoryId)?.name ?? "Products"}
          description={`${filteredProducts.length} product${filteredProducts.length === 1 ? "" : "s"}`}
        />
        <StoreProductResults
          loading={loading}
          error={productError}
          products={filteredProducts}
          hasFilters={hasFilters}
          onRetry={() => setLoadVersion((version) => version + 1)}
        />
      </section> : activeSection === "reviews" ? <StoreReviewsPanel summary={storeReviews} error={storeReviewsError} /> : <StoreAboutPanel settings={settings} />}
    </PageShell>
  )
}
