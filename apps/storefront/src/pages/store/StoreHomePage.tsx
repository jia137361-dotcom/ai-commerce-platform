import { useCallback, useEffect, useMemo, useState } from "react"
import { PageShell } from "../../components/layout/PageShell"
import { SectionHeader } from "../../components/layout/SectionHeader"
import { FilterDrawer, type FilterState } from "../../components/store-home/FilterDrawer"
import { ShopHero } from "../../components/store-home/ShopHero"
import { StoreAboutPanel } from "../../components/store-home/StoreAboutPanel"
import { StoreIdentity } from "../../components/store-home/StoreIdentity"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import { ProductCard } from "../../components/products/ProductCard"
import {
  fetchMarketplaceStores,
  fetchMarketplaceStoreBySlug,
  fetchProductCategories,
  fetchProducts,
  fetchStoreSettings,
  setActiveBuyerStoreId,
  type BuyerCategory,
  type BuyerStoreSettings,
} from "../../lib/buyer-api"
import { readBrowseUrlState, syncBrowseUrlState } from "../../lib/buyer-browse-url"
import { enterLegacyDefaultStoreContext, getLegacyDefaultStoreId } from "../../lib/buyer-store-context"
import { useBuyerLocale } from "../../lib/locale"
import type { StoreProduct } from "../../lib/mock-data"
import { buildSettingsStoreHref } from "../../lib/storefront-links"

type StoreHomePageProps = { cartCount: number; storeSlug?: string }
type Notice = { key: string; message: string }

const fallbackSettings: BuyerStoreSettings = {
  storeId: getLegacyDefaultStoreId(),
  brandName: "Store",
  galleryUrls: [],
  metadata: {},
}

const CATALOG_PER_PAGE = 24
const SHIP_TO_STORAGE_KEY = "citigoo:ship_to_country"

type StoreSection = "items" | "about"

const readInitialShipToCountry = () => {
  if (typeof window === "undefined") return "us"
  return window.localStorage.getItem(SHIP_TO_STORAGE_KEY)?.trim().toLowerCase() || "us"
}

const productShipsToCountry = (product: StoreProduct, countryCode: string) => {
  const normalized = countryCode.trim().toLowerCase()
  if (!normalized) return true
  const regions = product.supportedRegions ?? []
  if (!regions.length) return true
  return regions.some((region) => region.country_codes.map((code) => code.toLowerCase()).includes(normalized))
}

function scrollToVisibleId(id: string) {
  window.requestAnimationFrame(() => {
    const nodes = Array.from(document.querySelectorAll(`#${CSS.escape(id)}`)) as HTMLElement[]
    const visible = nodes.find((node) => node.offsetParent !== null) ?? nodes[0]
    visible?.scrollIntoView({ behavior: "smooth", block: "start" })
  })
}

function StoreFooter({ brandName, storeHref }: { brandName: string; storeHref: string }) {
  const { t } = useBuyerLocale()
  const year = new Date().getFullYear()
  return (
    <footer className="buyer-store-footer">
      <section>
        <h2>{brandName}</h2>
        <p>{t("heroDescription")}</p>
      </section>
      <section>
        <h2>{t("navShop")}</h2>
        <a href={storeHref}>{t("heroCtaShop")}</a>
        <a href="/saved">Saved</a>
        <a href="/cart">{t("navCart")}</a>
      </section>
      <section>
        <h2>{t("navMe")}</h2>
        <a href="/orders/lookup">Find an order</a>
        <a href="/account/orders">Order history</a>
        <a href="/account">{t("navMe")}</a>
      </section>
      <section>
        <h2>Help</h2>
        <a href="/help">Help Center</a>
        <a href="/about">About</a>
        <a href={`${storeHref}${storeHref.includes("?") ? "&" : "?"}tab=about`}>Shipping &amp; Returns</a>
        <a href="/terms">Terms</a>
        <a href="/privacy">Privacy</a>
        <a href="/cookies">Cookies</a>
      </section>
      <div className="buyer-store-legal">
        <span>
          © {year} {brandName}
        </span>
      </div>
    </footer>
  )
}

export function StoreHomePage({ cartCount, storeSlug }: StoreHomePageProps) {
  const { t } = useBuyerLocale()
  const initialUrl = readBrowseUrlState()
  const queryStoreId = initialUrl.storeId?.trim() || ""
  const [settings, setSettings] = useState<BuyerStoreSettings>(fallbackSettings)
  const [items, setItems] = useState<StoreProduct[]>([])
  const [catalogTotal, setCatalogTotal] = useState(0)
  const [catalogPage, setCatalogPage] = useState(1)
  const [catalogLastPage, setCatalogLastPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [catalogError, setCatalogError] = useState<string>()
  const [notices, setNotices] = useState<Notice[]>([])
  const [primaryTabId, setPrimaryTabId] = useState(
    initialUrl.category && initialUrl.category !== "all" ? initialUrl.category : "recommend"
  )
  const [supplierCategories, setSupplierCategories] = useState<BuyerCategory[]>([])
  const [query, setQuery] = useState(initialUrl.q ?? "")
  const [debouncedQuery, setDebouncedQuery] = useState(initialUrl.q ?? "")
  const [sort, setSort] = useState(initialUrl.sort ?? "recommended")
  const [filters, setFilters] = useState<FilterState>({})
  const [filterOpen, setFilterOpen] = useState(false)
  const [loadVersion, setLoadVersion] = useState(0)
  const [storeReady, setStoreReady] = useState(false)
  const [activeStoreId, setActiveStoreId] = useState(queryStoreId)
  const [activeSection, setActiveSection] = useState<StoreSection>(
    new URLSearchParams(window.location.search).get("tab") === "about" ? "about" : "items"
  )
  const [shipToCountry, setShipToCountry] = useState(readInitialShipToCountry)

  const activeCategoryId = useMemo(() => {
    if (primaryTabId !== "recommend") return primaryTabId
    return "all"
  }, [primaryTabId])

  const setCategoryFromControls = useCallback((categoryId: string) => {
    if (categoryId === "all") {
      setPrimaryTabId("recommend")
    } else {
      setPrimaryTabId(categoryId)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const pathname = storeSlug ? `/shops/${encodeURIComponent(storeSlug)}` : "/store"
    syncBrowseUrlState(pathname, {
      q: debouncedQuery || undefined,
      category: activeCategoryId,
      sort,
      storeId: activeStoreId || undefined,
    })
  }, [activeCategoryId, activeStoreId, debouncedQuery, sort, storeSlug])

  const updateShipToCountry = useCallback((countryCode: string) => {
    const normalized = countryCode.trim().toLowerCase() || "us"
    setShipToCountry(normalized)
    try {
      window.localStorage.setItem(SHIP_TO_STORAGE_KEY, normalized)
    } catch {
      // Ignore storage errors in private browsing.
    }
  }, [])

  const loadShell = useCallback(async (isActive: () => boolean) => {
    const [settingsResult, categoriesResult] = await Promise.all([
      fetchStoreSettings(),
      fetchProductCategories(),
    ])
    if (!isActive()) return
    setSettings(settingsResult.data)
    setSupplierCategories(categoriesResult.data)
    setNotices(
      [settingsResult, categoriesResult]
        .filter((result) => result.error)
        .map((result, index) => ({
          key: `${result.source}-${index}-${result.error}`,
          message: `${result.source === "mock" ? "Mock data" : "Static UI"} fallback: ${result.error}`,
        }))
    )
    setLoading(false)
  }, [])

  const loadCatalog = useCallback(
    async (page: number, append: boolean, isActive: () => boolean) => {
      if (append) setLoadingMore(true)
      else setCatalogLoading(true)

      const result = await fetchProducts()

      if (!isActive()) return

      setCatalogError(result.error)
      setCatalogTotal(result.data.length)
      setCatalogPage(page)
      setCatalogLastPage(1)
      setItems((current) => (append ? [...current, ...result.data] : result.data))
      setCatalogLoading(false)
      setLoadingMore(false)
    },
    []
  )

  useEffect(() => {
    let active = true
    const boot = async () => {
      setLoading(true)
      setStoreReady(false)
      const isLegacyDefaultQuery = queryStoreId === getLegacyDefaultStoreId()
      if (queryStoreId && !isLegacyDefaultQuery) {
        setActiveBuyerStoreId(queryStoreId)
        setActiveStoreId(queryStoreId)
      } else if (storeSlug) {
        const storeResult = await fetchMarketplaceStoreBySlug(storeSlug)
        if (!active) return
        if (!storeResult.data) {
          setLoading(false)
          setNotices([{ key: "store-missing", message: storeResult.error ?? "Store not found" }])
          return
        }
        setActiveBuyerStoreId(storeResult.data.storeId)
        setActiveStoreId(storeResult.data.storeId)
      } else {
        const storesResult = await fetchMarketplaceStores()
        if (!active) return
        const publicStore = storesResult.data.find((store) => store.productCount > 0)
        if (publicStore) {
          setActiveBuyerStoreId(publicStore.storeId)
          setActiveStoreId(publicStore.storeId)
        } else {
          enterLegacyDefaultStoreContext()
          setActiveStoreId(getLegacyDefaultStoreId())
          if (storesResult.error) {
            setNotices([{ key: "store-auto-select", message: storesResult.error }])
          }
        }
      }
      if (!active) return
      setStoreReady(true)
      await loadShell(() => active)
    }
    void boot()
    return () => {
      active = false
    }
  }, [loadShell, loadVersion, queryStoreId, storeSlug])

  useEffect(() => {
    if (!storeReady) return
    let active = true
    setItems([])
    void loadCatalog(1, false, () => active)
    return () => {
      active = false
    }
  }, [loadCatalog, loadVersion, storeReady])

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab")
    if (!tab) return
    if (tab === "about") setActiveSection("about")
    scrollToVisibleId(tab === "about" ? "about" : "products")
  }, [loadVersion])

  useEffect(() => {
    const scrollToHash = () => {
      const id = window.location.hash.replace(/^#/, "")
      if (!id) return
      scrollToVisibleId(id)
    }
    scrollToHash()
    window.addEventListener("hashchange", scrollToHash)
    return () => window.removeEventListener("hashchange", scrollToHash)
  }, [loading, catalogLoading, loadVersion])

  const activeCategoryName = useMemo(() => {
    if (activeCategoryId === "all") return t("catalogTitle")
    return supplierCategories.find((category) => String(category.id) === activeCategoryId)?.name ?? t("catalogTitle")
  }, [activeCategoryId, supplierCategories, t])

  const sortedItems = useMemo(() => {
    let list = [...items]
    if (activeCategoryId !== "all") {
      list = list.filter((item) => item.categoryIds?.includes(activeCategoryId))
    }
    list = list.filter((item) => productShipsToCountry(item, shipToCountry))
    if (debouncedQuery) {
      const queryText = debouncedQuery.toLowerCase()
      list = list.filter((item) =>
        [item.title, item.description, item.category].some((value) => value?.toLowerCase().includes(queryText))
      )
    }
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
      if (sort === "name") return left.title.localeCompare(right.title)
      return 0
    })
  }, [activeCategoryId, debouncedQuery, filters.maxPrice, filters.minPrice, items, shipToCountry, sort])

  const brand = settings.brandName?.trim() || "Store"
  const storeHref = buildSettingsStoreHref(settings)
  const hasFilters = activeCategoryId !== "all" || Boolean(debouncedQuery) || Boolean(filters.minPrice || filters.maxPrice)
  const productSearchControls = (
    <form className="buyer-shop-inline-search" onSubmit={(event) => event.preventDefault()}>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search this store"
        aria-label="Search this store"
      />
      {query ? (
        <button type="button" onClick={() => setQuery("")}>
          Clear
        </button>
      ) : null}
    </form>
  )

  return (
    <PageShell
      className="buyer-store-page buyer-mhome-page"
      contentClassName="buyer-shop-shell-content buyer-mhome-shell"
      header={
        <StoreTopBar
          settings={settings}
          cartCount={cartCount}
          shipToCountry={shipToCountry}
          onShipToCountryChange={updateShipToCountry}
          storeHref={storeHref}
        />
      }
      footer={<StoreFooter brandName={brand} storeHref={storeHref} />}
    >
      <div className="buyer-mhome-mobile-body">
        <ShopHero
          brandName={brand}
          imageUrl={settings.bannerUrl}
          isFallback={!settings.bannerUrl}
          announcement={settings.announcement}
          description={settings.description}
          studioHref="/studio"
          shopHref={`${storeHref}#products`}
        />
        <StoreIdentity settings={settings} />
        <nav className="buyer-shop-tabs" aria-label="Store sections">
          <button className={activeSection === "items" ? "active" : ""} type="button" onClick={() => setActiveSection("items")}>All items</button>
          <button className={activeSection === "about" ? "active" : ""} type="button" onClick={() => setActiveSection("about")}>About</button>
        </nav>
        {activeSection === "items" ? productSearchControls : null}

        {notices.length ? (
          <aside className="buyer-store-fallback" role="status">
            {notices.map((notice) => (
              <p key={notice.key}>{notice.message}</p>
            ))}
          </aside>
        ) : null}

        {activeSection === "items" && catalogError ? (
          <p className="buyer-mhome-error" role="alert">
            {catalogError}
          </p>
        ) : null}

        {activeSection === "items" && (loading || catalogLoading) ? <p className="buyer-mhome-loading">{t("catalogLoading")}</p> : null}

        {activeSection === "items" && !loading && !catalogLoading ? (
          <section className="buyer-mhome-grid" id="products" aria-label="Products">
            {sortedItems.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </section>
        ) : null}

        {activeSection === "items" && !loading && !catalogLoading && !sortedItems.length ? (
          <p className="buyer-mhome-empty">{hasFilters ? t("catalogEmptyFiltered") : t("catalogEmpty")}</p>
        ) : null}

        {activeSection === "items" && catalogPage < catalogLastPage ? (
          <div className="buyer-mhome-more">
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => void loadCatalog(catalogPage + 1, true, () => true)}
            >
              {loadingMore ? t("catalogLoadingMore") : "See more"}
            </button>
          </div>
        ) : null}

        {activeSection === "items" ? <p className="buyer-mhome-count">
          {catalogTotal || sortedItems.length} items
        </p> : null}
        {activeSection === "about" ? <StoreAboutPanel settings={settings} /> : null}
      </div>

      <div className="buyer-mhome-desktop-body">
        <ShopHero
          brandName={brand}
          imageUrl={settings.bannerUrl}
          isFallback={!settings.bannerUrl}
          announcement={settings.announcement}
          description={settings.description}
          studioHref="/studio"
          shopHref={`${storeHref}#products`}
        />
        <StoreIdentity settings={settings} />
        <nav className="buyer-shop-tabs" aria-label="Store sections">
          <button className={activeSection === "items" ? "active" : ""} type="button" onClick={() => setActiveSection("items")}>All items</button>
          <button className={activeSection === "about" ? "active" : ""} type="button" onClick={() => setActiveSection("about")}>About</button>
        </nav>

        {notices.length ? (
          <aside className="buyer-store-fallback" role="status" aria-label="Fallback data notice">
            {notices.map((notice) => (
              <p key={notice.key}>{notice.message}</p>
            ))}
          </aside>
        ) : null}

        {activeSection === "items" ? <section className="buyer-shop-products" id="products">
          <SectionHeader
            eyebrow={t("catalogEyebrow")}
            title={activeCategoryName}
            description={`${sortedItems.length} ${t("catalogCount")} available for selected destination`}
            actions={productSearchControls}
          />
          {loading || catalogLoading ? <p className="buyer-mhome-loading">{t("catalogLoading")}</p> : null}
          {catalogError && !sortedItems.length ? (
            <p className="buyer-mhome-error" role="alert">{catalogError}</p>
          ) : null}
          {!loading && !catalogLoading && sortedItems.length ? (
            <section className="buyer-shop-product-grid" aria-label={t("catalogTitle")}>
              {sortedItems.map((product) => (
                <div key={product.id}>
                  <ProductCard product={product} />
                </div>
              ))}
            </section>
          ) : null}
          {!loading && !catalogLoading && !sortedItems.length && !catalogError ? (
            <p className="buyer-mhome-empty">{hasFilters ? t("catalogEmptyFiltered") : t("catalogEmpty")}</p>
          ) : null}
        </section> : <StoreAboutPanel settings={settings} />}
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
