import { useCallback, useEffect, useMemo, useState } from "react"
import { PageShell } from "../../components/layout/PageShell"
import { SectionHeader } from "../../components/layout/SectionHeader"
import { ShopBrowseControls } from "../../components/store-home/ShopBrowseControls"
import { ShopHero } from "../../components/store-home/ShopHero"
import { StoreIdentity } from "../../components/store-home/StoreIdentity"
import { StoreProductResults } from "../../components/store-home/StoreProductResults"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import {
  fetchProductCategories,
  fetchProducts,
  fetchStoreSettings,
  type BuyerCategory,
  type BuyerStoreSettings,
  type DataSource,
} from "../../lib/buyer-api"
import type { StoreProduct } from "../../lib/mock-data"

type StoreHomePageProps = { cartCount: number }
type Notice = { key: string; message: string }

const fallbackSettings: BuyerStoreSettings = {
  storeId: "default_store",
  brandName: "Citigoo Official Store",
  metadata: {},
}

const readMetadataString = (metadata: Record<string, unknown>, ...keys: string[]) => {
  for (const key of keys) {
    const value = metadata[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return undefined
}

function StoreFooter() {
  return (
    <footer className="buyer-store-footer">
      <section><h2>Citigoo</h2><p>Curated products, protected checkout, and reliable order support.</p></section>
      <section><h2>Shopping</h2><a href="/store">All products</a><a href="/cart">Cart</a></section>
      <section><h2>Customer service</h2><a href="/orders/lookup">Find an order</a><a href="/account/orders">Order history</a></section>
      <section><h2>Help</h2><a href="/help">Help Center</a><a href="/help">Contact us</a></section>
      <div className="buyer-store-legal"><span>© 2026 Citigoo Limited</span><a href="/terms">Terms</a><a href="/privacy">Privacy</a></div>
    </footer>
  )
}

export function StoreHomePage({ cartCount }: StoreHomePageProps) {
  const [settings, setSettings] = useState<BuyerStoreSettings>(fallbackSettings)
  const [categories, setCategories] = useState<BuyerCategory[]>([{ id: "all", name: "All items" }])
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [notices, setNotices] = useState<Notice[]>([])
  const [activeCategoryId, setActiveCategoryId] = useState("all")
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState("recommended")
  const [productSource, setProductSource] = useState<DataSource>("backend")
  const [loadVersion, setLoadVersion] = useState(0)

  const loadStore = useCallback(async (isActive: () => boolean) => {
    setLoading(true)
    const [settingsResult, categoriesResult, productsResult] = await Promise.all([
      fetchStoreSettings(),
      fetchProductCategories(),
      fetchProducts(),
    ])

    if (!isActive()) return

    setSettings(settingsResult.data)
    setCategories(categoriesResult.data)
    setProducts(productsResult.data)
    setProductSource(productsResult.source)
    setNotices(
      [settingsResult, categoriesResult, productsResult]
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
    void loadStore(() => active)
    return () => { active = false }
  }, [loadStore, loadVersion])

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab")
    if (!tab) return
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

  const heroImage = readMetadataString(settings.metadata, "banner_url", "hero_image_url") || products.find((product) => product.imageUrl)?.imageUrl
  const hasFilters = activeCategoryId !== "all" || Boolean(query.trim())
  const productError = productSource === "mock" ? notices.find((notice) => notice.message.startsWith("Mock data"))?.message : undefined

  return (
    <PageShell
      className="buyer-store-page"
      contentClassName="buyer-shop-shell-content"
      header={<StoreTopBar settings={settings} cartCount={cartCount} />}
      footer={<StoreFooter />}
    >
      <ShopHero brandName={settings.brandName} imageUrl={heroImage} isFallback={!readMetadataString(settings.metadata, "banner_url", "hero_image_url")} />
      <StoreIdentity settings={settings} />
      <ShopBrowseControls
        categories={visibleCategories}
        activeCategoryId={activeCategoryId}
        onCategoryChange={setActiveCategoryId}
        query={query}
        onQueryChange={setQuery}
        sort={sort}
        onSortChange={setSort}
      />

      {notices.length ? (
        <aside className="buyer-store-fallback" role="status" aria-label="Fallback data notice">
          {notices.map((notice) => <p key={notice.key}>{notice.message}</p>)}
        </aside>
      ) : null}

      <section className="buyer-shop-products" id="products">
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
      </section>

      <section className="buyer-shop-about" id="about">
        <SectionHeader eyebrow="About" title={settings.brandName} description="Curated products with protected checkout and order support." />
        <p className="buyer-shop-about-copy">
          Browse published items from our seller studio, add to cart, and check out with your buyer account.
          Questions? Visit the <a href="/help">Help Center</a>.
        </p>
      </section>

      <section className="buyer-shop-reviews" id="reviews">
        <SectionHeader eyebrow="Reviews" title="Customer feedback" description="Ratings appear on each product detail page." />
        <p className="buyer-shop-about-copy">
          Open any product to read reviews and share your experience after delivery.
        </p>
      </section>
    </PageShell>
  )
}
