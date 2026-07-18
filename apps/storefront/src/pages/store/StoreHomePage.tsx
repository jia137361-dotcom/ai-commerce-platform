import { useCallback, useEffect, useMemo, useState } from "react"
import { PageShell } from "../../components/layout/PageShell"
import { SectionHeader } from "../../components/layout/SectionHeader"
import { ShopBrowseControls } from "../../components/store-home/ShopBrowseControls"
import { StoreAboutPanel } from "../../components/store-home/StoreAboutPanel"
import { ShopHero } from "../../components/store-home/ShopHero"
import { HowItWorksSection } from "../../components/store-home/HowItWorksSection"
import { StoreIdentity } from "../../components/store-home/StoreIdentity"
import { StoreCatalogResults } from "../../components/store-home/StoreCatalogResults"
import { StoreReviewsPanel } from "../../components/store-home/StoreReviewsPanel"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import {
  ensureSupplierCatalogBlank,
  fetchMarketplaceStoreBySlug,
  fetchStoreSettings,
  fetchStoreReviews,
  fetchSupplierCatalog,
  fetchSupplierCatalogCategories,
  setActiveBuyerStoreId,
  type BuyerReviewsSummary,
  type BuyerStoreSettings,
  type SupplierCatalogCategory,
  type SupplierCatalogItem,
} from "../../lib/buyer-api"
import { enterLegacyDefaultStoreContext, getLegacyDefaultStoreId } from "../../lib/buyer-store-context"
import {
  buildStudioEditorHref,
} from "../../lib/buyer-design-handoff"
import { navigateBuyer } from "../../lib/buyer-navigate"
import { useBuyerLocale } from "../../lib/locale"

type StoreHomePageProps = { cartCount: number; storeSlug?: string }
type Notice = { key: string; message: string }

const fallbackSettings: BuyerStoreSettings = {
  storeId: getLegacyDefaultStoreId(),
  brandName: "Store",
  galleryUrls: [],
  metadata: {},
}

const CATALOG_PER_PAGE = 24

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
        <a href="/help">Contact us</a>
      </section>
      <div className="buyer-store-legal">
        <span>
          © {year} {brandName}
        </span>
        <a href="/terms">Terms</a>
        <a href="/privacy">Privacy</a>
      </div>
    </footer>
  )
}

export function StoreHomePage({ cartCount, storeSlug }: StoreHomePageProps) {
  const { t } = useBuyerLocale()
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
  const [activeCategoryId, setActiveCategoryId] = useState("all")
  const [supplierCategories, setSupplierCategories] = useState<SupplierCatalogCategory[]>([])
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [sort, setSort] = useState("recommended")
  const [loadVersion, setLoadVersion] = useState(0)
  const [activeSection, setActiveSection] = useState<"items" | "reviews" | "about">("items")
  const [storeReviews, setStoreReviews] = useState<BuyerReviewsSummary | null>(null)
  const [storeReviewsError, setStoreReviewsError] = useState<string>()
  const [openingId, setOpeningId] = useState<number | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [query])

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

  const [storeReady, setStoreReady] = useState(false)

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
    window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }, [loadVersion])

  useEffect(() => {
    const scrollToHash = () => {
      const id = window.location.hash.replace(/^#/, "")
      if (!id) return
      window.requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
      })
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
    return [...items].sort((left, right) => {
      if (sort === "price-asc") {
        return (left.estimatedRetailUsd ?? Number.POSITIVE_INFINITY) - (right.estimatedRetailUsd ?? Number.POSITIVE_INFINITY)
      }
      if (sort === "price-desc") {
        return (right.estimatedRetailUsd ?? Number.NEGATIVE_INFINITY) - (left.estimatedRetailUsd ?? Number.NEGATIVE_INFINITY)
      }
      if (sort === "name") return left.name.localeCompare(right.name)
      return 0
    })
  }, [items, sort])

  const heroImage = settings.bannerUrl
  const hasFilters = activeCategoryId !== "all" || Boolean(debouncedQuery)
  const brand = settings.brandName?.trim() || "Store"

  const handleCustomize = useCallback(async (item: SupplierCatalogItem) => {
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
  }, [openingId])

  return (
    <PageShell
      className="buyer-store-page"
      contentClassName="buyer-shop-shell-content"
      header={<StoreTopBar settings={settings} cartCount={cartCount} />}
      footer={<StoreFooter brandName={brand} />}
    >
      <ShopHero
        brandName={brand}
        imageUrl={heroImage}
        isFallback={!settings.bannerUrl}
        announcement={settings.announcement}
        description={settings.description}
        studioHref="/studio"
      />
      <StoreIdentity settings={settings} />
      <HowItWorksSection studioHref="/studio" />
      <ShopBrowseControls
        categories={supplierCategories}
        activeCategoryId={activeCategoryId}
        onCategoryChange={(categoryId) => {
          setActiveCategoryId(categoryId)
          setActiveSection("items")
        }}
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
            onCustomize={handleCustomize}
            canLoadMore={catalogPage < catalogLastPage}
            loadingMore={loadingMore}
            onLoadMore={() => {
              void loadCatalog(catalogPage + 1, true, () => true)
            }}
          />
        </section>
      ) : activeSection === "reviews" ? (
        <StoreReviewsPanel summary={storeReviews} error={storeReviewsError} />
      ) : (
        <StoreAboutPanel settings={settings} />
      )}
    </PageShell>
  )
}
