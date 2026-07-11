import { useCallback, useEffect, useMemo, useState } from "react"
import { PageShell } from "../../components/layout/PageShell"
import { StoreFooter } from "../../components/layout/StoreFooter"
import { SectionHeader } from "../../components/layout/SectionHeader"
import { ProductCard } from "../../components/products/ProductCard"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import {
  fetchMarketplaceProducts,
  fetchMarketplaceStores,
  marketplaceBuyerSettings,
  type MarketplaceStore,
} from "../../lib/buyer-api"
import { enterMarketplaceContext } from "../../lib/buyer-store-context"
import type { StoreProduct } from "../../lib/mock-data"

type MarketplaceHomePageProps = {
  cartCount: number
}

export function MarketplaceHomePage({ cartCount }: MarketplaceHomePageProps) {
  const [stores, setStores] = useState<MarketplaceStore[]>([])
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [storeQuery, setStoreQuery] = useState("")
  const [productQuery, setProductQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()

  const loadMarketplace = useCallback(async (isActive: () => boolean) => {
    setLoading(true)
    setError(undefined)
    const [storesResult, productsResult] = await Promise.all([
      fetchMarketplaceStores(storeQuery),
      fetchMarketplaceProducts({ query: productQuery }),
    ])
    if (!isActive()) return
    setStores(storesResult.data)
    setProducts(productsResult.data)
    setError(storesResult.error ?? productsResult.error)
    setLoading(false)
  }, [productQuery, storeQuery])

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
    >
      <section className="buyer-marketplace-hero">
        <p className="buyer-marketplace-eyebrow">CiiVerse Marketplace</p>
        <h1>发现独立设计师店铺</h1>
        <p>浏览平台上的全部活跃店铺，或搜索跨店商品。</p>
      </section>

      <section className="buyer-marketplace-section">
        <SectionHeader eyebrow="Shops" title="全部店铺" description={`${visibleStores.length} 家活跃店铺`} />
        <div className="buyer-marketplace-search-row">
          <input
            type="search"
            value={storeQuery}
            onChange={(event) => setStoreQuery(event.target.value)}
            placeholder="搜索店铺名称或 slug"
            aria-label="Search stores"
          />
        </div>
        {loading ? <p className="buyer-marketplace-status">加载店铺中…</p> : null}
        {!loading && visibleStores.length === 0 ? (
          <p className="buyer-marketplace-status">暂无可见店铺。</p>
        ) : (
          <div className="buyer-marketplace-store-grid">
            {visibleStores.map((store) => (
              <a key={store.storeId} className="buyer-marketplace-store-card" href={`/shops/${encodeURIComponent(store.slug)}`}>
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
            ))}
          </div>
        )}
      </section>

      <section className="buyer-marketplace-section" id="marketplace-products">
        <SectionHeader eyebrow="Products" title="跨店精选" description={`${products.length} 件已发布商品`} />
        <div className="buyer-marketplace-search-row">
          <input
            type="search"
            value={productQuery}
            onChange={(event) => setProductQuery(event.target.value)}
            placeholder="搜索商品标题"
            aria-label="Search products"
          />
          <button type="button" onClick={() => void loadMarketplace(() => true)}>
            搜索
          </button>
        </div>
        {error ? <p className="buyer-marketplace-error" role="alert">{error}</p> : null}
        {loading ? <p className="buyer-marketplace-status">加载商品中…</p> : null}
        {!loading && products.length === 0 ? (
          <p className="buyer-marketplace-status">暂无跨店商品。</p>
        ) : (
          <div className="buyer-shop-product-grid">
            {products.map((product) => (
              <ProductCard key={`${product.storeId ?? "store"}-${product.id}`} product={product} />
            ))}
          </div>
        )}
      </section>
    </PageShell>
  )
}
