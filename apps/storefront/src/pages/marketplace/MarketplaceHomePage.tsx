import { useCallback, useEffect, useMemo, useState } from "react"
import { PageShell } from "../../components/layout/PageShell"
import { StoreFooter } from "../../components/layout/StoreFooter"
import { SectionHeader } from "../../components/layout/SectionHeader"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import {
  fetchMarketplaceStores,
  marketplaceBuyerSettings,
  type MarketplaceStore,
} from "../../lib/buyer-api"
import { enterMarketplaceContext } from "../../lib/buyer-store-context"

type MarketplaceHomePageProps = {
  cartCount: number
}

export function MarketplaceHomePage({ cartCount }: MarketplaceHomePageProps) {
  const [stores, setStores] = useState<MarketplaceStore[]>([])
  const [storeQuery, setStoreQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()

  const loadMarketplace = useCallback(async (isActive: () => boolean) => {
    setLoading(true)
    setError(undefined)
    const storesResult = await fetchMarketplaceStores(storeQuery)
    if (!isActive()) return
    setStores(storesResult.data)
    setError(storesResult.error)
    setLoading(false)
  }, [storeQuery])

  useEffect(() => {
    enterMarketplaceContext()
    let active = true
    void loadMarketplace(() => active)
    return () => {
      active = false
    }
  }, [loadMarketplace])

  const visibleStores = useMemo(() => {
    const normalized = storeQuery.trim().toLowerCase()
    if (!normalized) return stores
    return stores.filter((store) =>
      `${store.name} ${store.brandName} ${store.slug}`.toLowerCase().includes(normalized)
    )
  }, [storeQuery, stores])

  return (
    <PageShell
      className="buyer-store-page buyer-marketplace-page"
      contentClassName="buyer-shop-shell-content"
      header={<StoreTopBar settings={marketplaceBuyerSettings} cartCount={cartCount} marketplaceMode />}
      footer={<StoreFooter />}
      cartCount={cartCount}
    >
      <section className="buyer-marketplace-hero">
        <p className="buyer-marketplace-eyebrow">Stores</p>
        <h1>Shop independent CitiGoo stores</h1>
        <p>Choose a store to browse its published products, policies, follow button, and seller profile.</p>
      </section>

      <section className="buyer-marketplace-section">
        <SectionHeader eyebrow="Shops" title="Active stores" description={`${visibleStores.length} stores`} />
        <div className="buyer-marketplace-search-row">
          <input
            type="search"
            value={storeQuery}
            onChange={(event) => setStoreQuery(event.target.value)}
            placeholder="Search store name or slug"
            aria-label="Search stores"
          />
        </div>
        {loading ? <p className="buyer-marketplace-status">Loading stores…</p> : null}
        {!loading && visibleStores.length === 0 ? (
          <p className="buyer-marketplace-status">No visible stores yet.</p>
        ) : (
          <div className="buyer-marketplace-store-grid">
            {visibleStores.map((store) => {
              const href = store.slug
                ? `/shops/${encodeURIComponent(store.slug)}`
                : `/store?store_id=${encodeURIComponent(store.storeId)}`
              return (
              <a key={store.storeId} className="buyer-marketplace-store-card" href={href}>
                <div className="buyer-marketplace-store-media">
                  {store.bannerUrl || store.logoUrl ? (
                    <img src={store.bannerUrl ?? store.logoUrl} alt={store.brandName} loading="lazy" />
                  ) : (
                    <span>{store.brandName.slice(0, 1).toUpperCase()}</span>
                  )}
                </div>
                <div className="buyer-marketplace-store-body">
                  <h3>{store.brandName}</h3>
                  <p>{store.description ?? store.name}</p>
                  <small>{store.productCount} 件商品</small>
                </div>
              </a>
            )})}
          </div>
        )}
      </section>
      {error ? <p className="buyer-marketplace-error" role="alert">{error}</p> : null}
    </PageShell>
  )
}
