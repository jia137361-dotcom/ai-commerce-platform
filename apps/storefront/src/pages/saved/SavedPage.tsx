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
import { fetchFavoriteProducts, fetchProducts, toggleProductFavorite } from "../../lib/buyer-api"
import type { StoreProduct } from "../../lib/mock-data"
import { useBuyerPageSettings } from "../../lib/useBuyerPageSettings"
import { buildSettingsStoreHref } from "../../lib/storefront-links"
import { buildProductSignInHref } from "../product/product-auth"
import { enterLegacyDefaultStoreContext } from "../../lib/buyer-store-context"

type SavedPageProps = { cartCount: number }

export function SavedPage({ cartCount }: SavedPageProps) {
  const auth = useBuyerAuth()
  const { settings, marketplaceMode } = useBuyerPageSettings()
  const storeHref = buildSettingsStoreHref(settings)
  const [favorites, setFavorites] = useState<
    Array<{ id: string; title: string; price?: number; image_url?: string }>
  >([])
  const [recommendations, setRecommendations] = useState<StoreProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [managing, setManaging] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [removing, setRemoving] = useState(false)
  const [manageError, setManageError] = useState<string>()

  useEffect(() => {
    enterLegacyDefaultStoreContext()
  }, [])

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      const productsPromise = fetchProducts()
      if (!auth.customer) {
        const productsResult = await productsPromise
        if (!active) return
        setRecommendations(productsResult.data.slice(0, 8))
        setLoading(false)
        return
      }
      const [favResult, productsResult] = await Promise.all([fetchFavoriteProducts(), productsPromise])
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

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const removeSelected = async () => {
    if (!selectedIds.size || removing) return
    setRemoving(true)
    setManageError(undefined)
    const ids = Array.from(selectedIds)
    try {
      await Promise.all(ids.map((id) => toggleProductFavorite(id, true)))
      setFavorites((current) => current.filter((item) => !selectedIds.has(item.id)))
      setSelectedIds(new Set())
      setManaging(false)
    } catch (error) {
      setManageError(error instanceof Error ? error.message : "Unable to remove saved products.")
    } finally {
      setRemoving(false)
    }
  }

  return (
    <PageShell
      className="buyer-store-page buyer-saved-page"
      contentClassName="buyer-mhome-shell buyer-saved-shell"
      header={<StoreTopBar settings={settings} cartCount={cartCount} marketplaceMode={marketplaceMode} />}
      footer={<StoreFooter />}
      cartCount={cartCount}
      storeHref={storeHref}
    >
      <header className="buyer-saved-header">
        <h1>My Saved ({favorites.length})</h1>
        {auth.customer && favorites.length ? (
          <button
            type="button"
            className="buyer-saved-manage"
            onClick={() => {
              setManaging((value) => !value)
              setSelectedIds(new Set())
              setManageError(undefined)
            }}
          >
            {managing ? "Done" : "Manage"}
          </button>
        ) : null}
      </header>

      {managing ? (
        <div className="buyer-saved-manage-bar">
          <button
            type="button"
            onClick={() =>
              setSelectedIds(
                selectedIds.size === favorites.length ? new Set() : new Set(favorites.map((item) => item.id))
              )
            }
          >
            {selectedIds.size === favorites.length ? "Clear selection" : "Select all"}
          </button>
          <span>{selectedIds.size} selected</span>
          <button type="button" className="danger" disabled={!selectedIds.size || removing} onClick={() => void removeSelected()}>
            {removing ? "Removing…" : "Remove"}
          </button>
        </div>
      ) : null}
      {manageError ? <p className="buyer-saved-manage-error" role="alert">{manageError}</p> : null}

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
              <li key={item.id} className={managing ? "managing" : ""}>
                {managing ? (
                  <label className="buyer-saved-select">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleSelected(item.id)}
                    />
                    <span className="sr-only">Select {item.title}</span>
                  </label>
                ) : null}
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
