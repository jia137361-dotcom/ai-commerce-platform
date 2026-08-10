import { useCallback, useEffect, useState } from "react"
import { PageShell } from "../../components/layout/PageShell"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import { StoreCatalogResults } from "../../components/store-home/StoreCatalogResults"
import {
  ensureSupplierCatalogBlank,
  fetchStoreSettings,
  fetchSupplierCatalog,
  type BuyerStoreSettings,
  type SupplierCatalogItem,
} from "../../lib/buyer-api"
import {
  buildAiDesignHref,
  buildStudioEditorHref,
  peekPendingStudioMaterial,
  takePendingStudioMaterial,
} from "../../lib/buyer-design-handoff"
import { enterLegacyDefaultStoreContext, getLegacyDefaultStoreId } from "../../lib/buyer-store-context"
import { navigateBuyer } from "../../lib/buyer-navigate"
import { useBuyerLocale } from "../../lib/locale"

type StudioLandingPageProps = {
  cartCount: number
}

const fallbackSettings: BuyerStoreSettings = {
  storeId: getLegacyDefaultStoreId(),
  brandName: "Store",
  galleryUrls: [],
  metadata: {},
}

function StudioFooter({ brandName }: { brandName: string }) {
  const { t } = useBuyerLocale()
  const year = new Date().getFullYear()
  return (
    <footer className="buyer-store-footer">
      <section>
        <h2>{brandName}</h2>
        <p>{t("studioDescription")}</p>
      </section>
      <section>
        <h2>{t("navShop")}</h2>
        <a href="/store">{t("heroCtaShop")}</a>
        <a href="/ai-design">{t("navAiDesign")}</a>
        <a href="/studio">{t("navStudio")}</a>
        <a href="/cart">{t("navCart")}</a>
      </section>
      <section>
        <h2>{t("navMe")}</h2>
        <a href="/orders/lookup">Find an order</a>
        <a href="/account/orders">Order history</a>
      </section>
      <div className="buyer-store-legal">
        <span>
          © {year} {brandName}
        </span>
        <a href="/about">About</a>
        <a href="/terms">Terms</a>
        <a href="/privacy">Privacy</a>
        <a href="/cookies">Cookies</a>
      </div>
    </footer>
  )
}

export function StudioLandingPage({ cartCount }: StudioLandingPageProps) {
  const { t } = useBuyerLocale()
  const [settings, setSettings] = useState<BuyerStoreSettings>(fallbackSettings)
  const [items, setItems] = useState<SupplierCatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openingId, setOpeningId] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [pendingMaterial, setPendingMaterial] = useState(() => peekPendingStudioMaterial())

  const loadCatalog = useCallback(async (nextPage: number, append: boolean) => {
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }

    try {
      if (!append) {
        const settingsResult = await fetchStoreSettings()
        setSettings(settingsResult.data)
        if (settingsResult.error) setError(settingsResult.error)
      }

      const catalogResult = await fetchSupplierCatalog({ page: nextPage, perPage: 24 })
      setItems((current) => (append ? [...current, ...catalogResult.data.items] : catalogResult.data.items))
      setPage(catalogResult.data.page)
      setLastPage(catalogResult.data.lastPage)
      if (catalogResult.error) setError(catalogResult.error)
      else if (append) setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    enterLegacyDefaultStoreContext()
    setPendingMaterial(peekPendingStudioMaterial())
    void loadCatalog(1, false)
  }, [loadCatalog])

  const handleCustomize = useCallback(
    async (item: SupplierCatalogItem) => {
      if (openingId != null) return
      setOpeningId(item.id)
      setError(null)
      try {
        const ensured = await ensureSupplierCatalogBlank({ basicProductId: item.id })
        const pending = takePendingStudioMaterial()
        setPendingMaterial(null)
        navigateBuyer(buildStudioEditorHref(ensured.productId, pending?.materialId))
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setOpeningId(null)
      }
    },
    [openingId]
  )

  const brand = settings.brandName?.trim() || "Store"

  return (
    <PageShell
      className="buyer-studio-landing-page"
      contentClassName="buyer-studio-landing-content"
      header={<StoreTopBar settings={settings} cartCount={cartCount} />}
      footer={<StudioFooter brandName={brand} />}
      cartCount={cartCount}
    >
      <section className="buyer-studio-landing-hero">
        <p className="buyer-studio-landing-kicker">{t("studioKicker")}</p>
        <h1>{t("studioTitle")}</h1>
        <p>{t("studioDescription")}</p>
        <div className="buyer-studio-landing-actions">
          <a className="buyer-ui-button buyer-ui-button--ghost" href={buildAiDesignHref()}>
            {t("studioOpenAiDesign")}
          </a>
        </div>
      </section>

      {pendingMaterial ? (
        <aside className="buyer-studio-pending-material" role="status">
          {pendingMaterial.designImageUrl ? (
            <img src={pendingMaterial.designImageUrl} alt="" />
          ) : null}
          <div>
            <p>{t("studioPendingMaterial")}</p>
            <small>{pendingMaterial.title || pendingMaterial.prompt || pendingMaterial.materialId}</small>
          </div>
        </aside>
      ) : null}

      <StoreCatalogResults
        loading={loading}
        error={error ?? undefined}
        items={items}
        hasFilters={false}
        openingId={openingId}
        onRetry={() => void loadCatalog(1, false)}
        onViewDetail={handleCustomize}
        onDesignNow={handleCustomize}
        canLoadMore={page < lastPage}
        loadingMore={loadingMore}
        onLoadMore={() => void loadCatalog(page + 1, true)}
      />
    </PageShell>
  )
}
