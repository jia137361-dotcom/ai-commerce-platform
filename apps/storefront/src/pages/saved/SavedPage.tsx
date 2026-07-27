/**
 * Saved page — presentation only (页面分析 image149).
 * Same APIs: fetchFavoriteProducts, fetchProducts, toggle remains on PDP.
 */
import { useEffect, useState } from "react"
import { useBuyerAuth } from "../../auth/useBuyerAuth"
import { PageShell } from "../../components/layout/PageShell"
import { StoreFooter } from "../../components/layout/StoreFooter"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import { ProductCard } from "../../components/products/ProductCard"
import { fetchFavoriteProducts, fetchProducts } from "../../lib/buyer-api"
import type { StoreProduct } from "../../lib/mock-data"
import { useBuyerPageSettings } from "../../lib/useBuyerPageSettings"
import { buildProductSignInHref } from "../product/product-auth"
import { enterLegacyDefaultStoreContext } from "../../lib/buyer-store-context"

type SavedPageProps = { cartCount: number }

export function SavedPage({ cartCount }: SavedPageProps) {
  const auth = useBuyerAuth()
  const { settings, marketplaceMode } = useBuyerPageSettings()
  const [favorites, setFavorites] = useState<
    Array<{ id: string; title: string; price?: number; image_url?: string }>
  >([])
  const [recommendations, setRecommendations] = useState<StoreProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    enterLegacyDefaultStoreContext()
  }, [])

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      if (!auth.customer) {
        setLoading(false)
        return
      }
      const [favResult, productsResult] = await Promise.all([fetchFavoriteProducts(), fetchProducts()])
      if (!active) return
      setFavorites(favResult.favorites ?? [])
      setRecommendations(productsResult.data.slice(0, 8))
      setLoading(false)
    }
    void load()
    return () => {
      active = false
    }
  }, [auth.customer?.id])

  return (
    <PageShell
      className="buyer-store-page buyer-saved-page"
      contentClassName="buyer-mhome-shell buyer-saved-shell"
      header={<StoreTopBar settings={settings} cartCount={cartCount} marketplaceMode={marketplaceMode} />}
      footer={<StoreFooter />}
    >
      <header className="buyer-saved-header">
        <h1>My Saved ({favorites.length})</h1>
        <span className="buyer-saved-manage">Manage</span>
      </header>

      {!auth.customer && !auth.isLoading ? (
        <section className="buyer-saved-empty">
          <p>Sign in to view your saved products.</p>
          <a href={buildProductSignInHref("/saved")}>Sign in</a>
        </section>
      ) : null}

      {auth.customer && loading ? <p className="buyer-saved-loading">Loading…</p> : null}

      {auth.customer && !loading ? (
        favorites.length ? (
          <ul className="buyer-saved-list">
            {favorites.map((item) => (
              <li key={item.id}>
                <a href={`/products/${encodeURIComponent(item.id)}`} className="buyer-saved-row">
                  {item.image_url ? <img src={item.image_url} alt="" /> : <span className="buyer-saved-thumb-fallback" />}
                  <div className="buyer-saved-copy">
                    <h2>{item.title}</h2>
                    {item.price != null ? (
                      <div className="buyer-saved-price-row">
                        <strong>${item.price.toFixed(2)}</strong>
                      </div>
                    ) : null}
                  </div>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <section className="buyer-saved-empty">
            <p>You have not saved any products yet.</p>
            <a href="/store">Browse catalog</a>
          </section>
        )
      ) : null}

      {recommendations.length ? (
        <section className="buyer-saved-recommendations">
          <h2>You may like</h2>
          <div className="buyer-mhome-grid">
            {recommendations.map((product) => (
              <div key={product.id} className="buyer-saved-rec-card">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </PageShell>
  )
}
