import { useCallback, useEffect, useMemo, useState } from "react"
import { PageShell } from "../../components/layout/PageShell"
import { SectionHeader } from "../../components/layout/SectionHeader"
import { FilterDrawer, type FilterState } from "../../components/store-home/FilterDrawer"
import { HowItWorksSection } from "../../components/store-home/HowItWorksSection"
import { MobileCatalogCard } from "../../components/store-home/MobileCatalogCard"
import { PromoBanner } from "../../components/store-home/PromoBanner"
import { ShopBrowseControls } from "../../components/store-home/ShopBrowseControls"
import { ShopHero } from "../../components/store-home/ShopHero"
import { StoreAboutPanel } from "../../components/store-home/StoreAboutPanel"
import { StoreCatalogResults } from "../../components/store-home/StoreCatalogResults"
import { StoreIdentity } from "../../components/store-home/StoreIdentity"
import { StoreReviewsPanel } from "../../components/store-home/StoreReviewsPanel"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import {
  ensureSupplierCatalogBlank,
  fetchMarketplaceStoreBySlug,
  fetchStoreReviews,
  fetchStoreSettings,
  fetchSupplierCatalog,
  fetchSupplierCatalogCategories,
  setActiveBuyerStoreId,
  type BuyerReviewsSummary,
  type BuyerStoreSettings,
  type SupplierCatalogCategory,
  type SupplierCatalogItem,
} from "../../lib/buyer-api"
import { readBrowseUrlState, syncBrowseUrlState } from "../../lib/buyer-browse-url"
import { buildStudioEditorHref } from "../../lib/buyer-design-handoff"
import { navigateBuyer } from "../../lib/buyer-navigate"
import { enterLegacyDefaultStoreContext, getLegacyDefaultStoreId } from "../../lib/buyer-store-context"
import { useBuyerLocale } from "../../lib/locale"

type StoreHomePageProps = { cartCount: number; storeSlug?: string }
type Notice = { key: string; message: string }
type ShopSection = "items" | "reviews" | "about"

const fallbackSettings: BuyerStoreSettings = {
  storeId: getLegacyDefaultStoreId(),
  brandName: "Store",
  galleryUrls: [],
  metadata: {},
}

const CATALOG_PER_PAGE = 24

function scrollToVisibleId(id: string) {
  window.requestAnimationFrame(() => {
    const nodes = Array.from(document.querySelectorAll(`#${CSS.escape(id)}`)) as HTMLElement[]
    const visible = nodes.find((node) => node.offsetParent !== null) ?? nodes[0]
    visible?.scrollIntoView({ behavior: "smooth", block: "start" })
  })
}

function StoreFooter({ brandName }: { brandName: string }) {
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
        <a href="/store">{t("heroCtaShop")}</a>
        <a href="/ai-design">{t("navAiDesign")}</a>
        <a href="/studio">{t("navStudio")}</a>
        <a href="/store#how-it-works">{t("navHowItWorks")}</a>
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
        <a href="/store?tab=about">Shipping &amp; Returns</a>
        <a href="/store?tab=reviews">Reviews</a>
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
  const [settings, setSettings] = useState<BuyerStoreSettings>(fallbackSettings)
  const [items, setItems] = useState<SupplierCatalogItem[]>([])
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
  const [supplierCategories, setSupplierCategories] = useState<SupplierCatalogCategory[]>([])
  const [query, setQuery] = useState(initialUrl.q ?? "")
  const [debouncedQuery, setDebouncedQuery] = useState(initialUrl.q ?? "")
  const [sort, setSort] = useState(initialUrl.sort ?? "recommended")
  const [filters, setFilters] = useState<FilterState>({})
  const [filterOpen, setFilterOpen] = useState(false)
  const [loadVersion, setLoadVersion] = useState(0)
  const [openingId, setOpeningId] = useState<number | null>(null)
  const [storeReady, setStoreReady] = useState(false)
  const [activeSection, setActiveSection] = useState<ShopSection>("items")
  const [storeReviews, setStoreReviews] = useState<BuyerReviewsSummary | null>(null)
  const [storeReviewsError, setStoreReviewsError] = useState<string>()

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
    setActiveSection("items")
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    syncBrowseUrlState("/store", {
      q: debouncedQuery || undefined,
      category: activeCategoryId,
      sort,
    })
  }, [activeCategoryId, debouncedQuery, sort])

  const loadShell = useCallback(async (isActive: () => boolean) => {
    const [settingsResult, reviewsResult, categoriesResult] = await Promise.all([
      fetchStoreSettings(),
      fetchStoreReviews(),
      fetchSupplierCatalogCategories(),
    ])
    if (!isActive()) return
    setSettings(settingsResult.data)
    setStoreReviews(reviewsResult.data)
    setStoreReviewsError(reviewsResult.error)
    setSupplierCategories(categoriesResult.data)
    setNotices(
      [settingsResult, reviewsResult, categoriesResult]
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

      const categoryId =
        activeCategoryId !== "all" && Number.isFinite(Number(activeCategoryId))
          ? Number(activeCategoryId)
          : null

      const result = await fetchSupplierCatalog({
        page,
        perPage: CATALOG_PER_PAGE,
        keyword: debouncedQuery || undefined,
        categoryId,
      })

      if (!isActive()) return

      setCatalogError(result.error)
      setCatalogTotal(result.data.total)
      setCatalogPage(result.data.page)
      setCatalogLastPage(result.data.lastPage)
      setItems((current) => (append ? [...current, ...result.data.items] : result.data.items))
      setCatalogLoading(false)
      setLoadingMore(false)
    },
    [activeCategoryId, debouncedQuery]
  )

  useEffect(() => {
    let active = true
    const boot = async () => {
      setLoading(true)
      setStoreReady(false)
      if (storeSlug) {
        const storeResult = await fetchMarketplaceStoreBySlug(storeSlug)
        if (!active) return
        if (!storeResult.data) {
          setLoading(false)
          setNotices([{ key: "store-missing", message: storeResult.error ?? "Store not found" }])
          return
        }
        setActiveBuyerStoreId(storeResult.data.storeId)
      } else {
        enterLegacyDefaultStoreContext()
      }
      if (!active) return
      setStoreReady(true)
      await loadShell(() => active)
    }
    void boot()
    return () => {
      active = false
    }
  }, [loadShell, loadVersion, storeSlug])

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
    if (tab === "reviews") setActiveSection("reviews")
    if (tab === "category" || tab === "items") setActiveSection("items")
    const targetId = tab === "category" || tab === "items" ? "products" : tab
    scrollToVisibleId(targetId)
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
  }, [loading, catalogLoading, loadVersion, activeSection])

  const activeCategoryName = useMemo(() => {
    if (activeCategoryId === "all") return t("catalogTitle")
    return supplierCategories.find((category) => String(category.id) === activeCategoryId)?.name ?? t("catalogTitle")
  }, [activeCategoryId, supplierCategories, t])

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
      if (sort === "name") return left.name.localeCompare(right.name)
      return 0
    })
  }, [filters.maxPrice, filters.minPrice, items, sort])

  const brand = settings.brandName?.trim() || "Store"
  const heroImage = settings.bannerUrl
  const hasFilters = activeCategoryId !== "all" || Boolean(debouncedQuery) || Boolean(filters.minPrice || filters.maxPrice)

  const openDetail = useCallback(
    async (item: SupplierCatalogItem) => {
      if (openingId != null) return
      setOpeningId(item.id)
      setCatalogError(undefined)
      try {
        const ensured = await ensureSupplierCatalogBlank({ basicProductId: item.id })
        navigateBuyer(`/products/${encodeURIComponent(ensured.productId)}`)
      } catch (error) {
        setCatalogError(error instanceof Error ? error.message : String(error))
      } finally {
        setOpeningId(null)
      }
    },
    [openingId]
  )

  const openDesign = useCallback(
    async (item: SupplierCatalogItem) => {
      if (openingId != null) return
      setOpeningId(item.id)
      setCatalogError(undefined)
      try {
        const ensured = await ensureSupplierCatalogBlank({ basicProductId: item.id })
        navigateBuyer(buildStudioEditorHref(ensured.productId))
      } catch (error) {
        setCatalogError(error instanceof Error ? error.message : String(error))
      } finally {
        setOpeningId(null)
      }
    },
    [openingId]
  )

  const renderHero = () => (
    <ShopHero
      brandName={brand}
      imageUrl={heroImage}
      isFallback={!settings.bannerUrl}
      announcement={settings.announcement}
      description={settings.description}
      studioHref="/studio"
    />
  )

  return (
    <PageShell
      className="buyer-store-page buyer-mhome-page"
      contentClassName="buyer-shop-shell-content buyer-mhome-shell"
      header={
        <StoreTopBar
          settings={settings}
          cartCount={cartCount}
          showMobileSearch
          searchValue={query}
          onSearchChange={setQuery}
          onSearchSubmit={() => {
            setDebouncedQuery(query.trim())
            setActiveSection("items")
          }}
        />
      }
      footer={<StoreFooter brandName={brand} />}
    >
      {/* —— Mobile: compact discovery chrome (no duplicate category rows) —— */}
      <div className="buyer-mhome-mobile-body">
        {renderHero()}
        <StoreIdentity settings={settings} />
        <PromoBanner />
        <HowItWorksSection studioHref="/studio" />

        <nav className="buyer-mhome-section-tabs" aria-label="Shop sections">
          <button
            type="button"
            className={activeSection === "items" ? "active" : ""}
            onClick={() => setActiveSection("items")}
          >
            {t("catalogAllItems")}
          </button>
          <button
            type="button"
            className={activeSection === "reviews" ? "active" : ""}
            onClick={() => setActiveSection("reviews")}
          >
            Reviews
          </button>
          <button
            type="button"
            className={activeSection === "about" ? "active" : ""}
            onClick={() => setActiveSection("about")}
          >
            About
          </button>
          {activeSection === "items" ? (
            <button type="button" className="buyer-mhome-filter-chip" onClick={() => setFilterOpen(true)}>
              Filters
            </button>
          ) : null}
        </nav>

        {notices.length ? (
          <aside className="buyer-store-fallback" role="status">
            {notices.map((notice) => (
              <p key={notice.key}>{notice.message}</p>
            ))}
          </aside>
        ) : null}

        {activeSection === "items" ? (
          <>
            {catalogError ? (
              <p className="buyer-mhome-error" role="alert">
                {catalogError}
              </p>
            ) : null}

            {loading || catalogLoading ? <p className="buyer-mhome-loading">{t("catalogLoading")}</p> : null}

            {!loading && !catalogLoading ? (
              <section className="buyer-mhome-grid" id="products" aria-label="Products">
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

            {!loading && !catalogLoading && !sortedItems.length ? (
              <p className="buyer-mhome-empty">{hasFilters ? t("catalogEmptyFiltered") : t("catalogEmpty")}</p>
            ) : null}

            {catalogPage < catalogLastPage ? (
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

            <p className="buyer-mhome-count">
              {catalogTotal || sortedItems.length} items
            </p>
          </>
        ) : activeSection === "reviews" ? (
          <div id="reviews">
            <StoreReviewsPanel summary={storeReviews} error={storeReviewsError} />
          </div>
        ) : (
          <div id="about">
            <StoreAboutPanel settings={settings} />
          </div>
        )}
      </div>

      {/* —— Desktop: store page capabilities on Temu chrome —— */}
      <div className="buyer-mhome-desktop-body">
        {renderHero()}
        <StoreIdentity settings={settings} />
        <PromoBanner />
        <HowItWorksSection studioHref="/studio" />

        <ShopBrowseControls
          categories={supplierCategories}
          activeCategoryId={activeCategoryId}
          onCategoryChange={setCategoryFromControls}
          query={query}
          onQueryChange={setQuery}
          sort={sort}
          onSortChange={setSort}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          onOpenFilters={() => setFilterOpen(true)}
        />

        {notices.length ? (
          <aside className="buyer-store-fallback" role="status" aria-label="Fallback data notice">
            {notices.map((notice) => (
              <p key={notice.key}>{notice.message}</p>
            ))}
          </aside>
        ) : null}

        {activeSection === "items" ? (
          <section className="buyer-shop-products" id="products">
            <SectionHeader
              eyebrow={t("catalogEyebrow")}
              title={activeCategoryName}
              description={`${catalogTotal || sortedItems.length} ${t("catalogCount")}`}
            />
            <StoreCatalogResults
              loading={loading || catalogLoading}
              error={catalogError}
              items={sortedItems}
              hasFilters={hasFilters}
              openingId={openingId}
              onRetry={() => setLoadVersion((version) => version + 1)}
              onViewDetail={openDetail}
              onDesignNow={openDesign}
              canLoadMore={catalogPage < catalogLastPage}
              loadingMore={loadingMore}
              onLoadMore={() => {
                void loadCatalog(catalogPage + 1, true, () => true)
              }}
            />
          </section>
        ) : activeSection === "reviews" ? (
          <div id="reviews">
            <StoreReviewsPanel summary={storeReviews} error={storeReviewsError} />
          </div>
        ) : (
          <div id="about">
            <StoreAboutPanel settings={settings} />
          </div>
        )}
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
