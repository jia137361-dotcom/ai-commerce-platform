import { useCallback, useEffect, useMemo, useState } from "react"
import { CartDeleteConfirm } from "../../components/cart/CartDeleteConfirm"
import { CartItemCard } from "../../components/cart/CartItemCard"
import { CartPageStatus } from "../../components/cart/CartPageStatus"
import { CartSummaryCard } from "../../components/cart/CartSummaryCard"
import { PageShell } from "../../components/layout/PageShell"
import { StoreFooter } from "../../components/layout/StoreFooter"
import { ProductCard } from "../../components/products/ProductCard"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import { normalizeBuyerCartItem } from "../../lib/buyer-cart"
import {
  deleteCartLineItem,
  fetchCart,
  fetchProducts,
  getBuyerCartStorageKey,
  getBuyerStoreId,
  updateCartLineItem,
  type BuyerStoreSettings,
} from "../../lib/buyer-api"
import type { StoreCart, StoreProduct } from "../../lib/mock-data"
import { removeCartItem, updateCartItemQuantity } from "./cart-actions"
import { useBuyerAuth } from "../../auth/useBuyerAuth"
import { getBuyerCartIdentity } from "../../lib/buyer-cart-storage"

type CartPageProps = { onCartUpdated: (cart: StoreCart | null) => void }

const cartSettings: BuyerStoreSettings = { storeId: getBuyerStoreId(), brandName: "Citigoo Official Store", metadata: {} }
const cartDependencies = { updateLineItem: updateCartLineItem, deleteLineItem: deleteCartLineItem }

export function CartPage({ onCartUpdated }: CartPageProps) {
  const auth = useBuyerAuth()
  const [cart, setCart] = useState<StoreCart | null>(null)
  const [recommendations, setRecommendations] = useState<StoreProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | undefined>()
  const [lineErrors, setLineErrors] = useState<Record<string, string>>({})
  const [updatingLineId, setUpdatingLineId] = useState<string | undefined>()
  const [deleteTargetId, setDeleteTargetId] = useState<string | undefined>()
  const [deleteError, setDeleteError] = useState<string | undefined>()
  const [deleting, setDeleting] = useState(false)
  const [loadVersion, setLoadVersion] = useState(0)

  const storageKey = getBuyerCartStorageKey(
    getBuyerStoreId(),
    getBuyerCartIdentity(auth.customer?.id, window.localStorage)
  )

  const loadCart = useCallback(async (isActive: () => boolean) => {
    setLoading(true)
    setLoadError(undefined)
    const cartId = window.localStorage.getItem(storageKey)
    if (!cartId) {
      if (isActive()) { setCart(null); onCartUpdated(null); setLoading(false) }
      return
    }
    try {
      const loaded = await fetchCart(cartId)
      if (isActive()) { setCart(loaded); onCartUpdated(loaded) }
    } catch (error) {
      if (isActive()) {
        setLoadError(error instanceof Error ? error.message : "Unable to load cart.")
        setCart(null)
        onCartUpdated(null)
      }
    } finally {
      if (isActive()) setLoading(false)
    }
  }, [onCartUpdated, storageKey])

  useEffect(() => {
    let active = true
    void loadCart(() => active)
    void fetchProducts().then((result) => {
      if (active && result.source === "backend") setRecommendations(result.data.slice(0, 4))
    })
    return () => { active = false }
  }, [loadCart, loadVersion])

  const items = useMemo(() => cart?.items.map(normalizeBuyerCartItem) ?? [], [cart])
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const deleteTarget = items.find((item) => item.id === deleteTargetId) ?? null

  const updateQuantity = async (lineId: string, quantity: number) => {
    if (!cart?.id || updatingLineId) return
    setUpdatingLineId(lineId)
    setLineErrors((errors) => ({ ...errors, [lineId]: "" }))
    try {
      const updated = await updateCartItemQuantity(cart.id, lineId, quantity, cartDependencies)
      setCart(updated)
      onCartUpdated(updated)
    } catch (error) {
      setLineErrors((errors) => ({ ...errors, [lineId]: error instanceof Error ? error.message : "Unable to update quantity." }))
    } finally {
      setUpdatingLineId(undefined)
    }
  }

  const confirmDelete = async () => {
    if (!cart?.id || !deleteTarget || deleting) return
    setDeleting(true)
    setDeleteError(undefined)
    try {
      const updated = await removeCartItem(cart.id, deleteTarget.id, cartDependencies)
      setCart(updated)
      onCartUpdated(updated)
      setDeleteTargetId(undefined)
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Unable to remove this item.")
    } finally {
      setDeleting(false)
    }
  }

  const empty = !cart || !items.length
  return (
    <PageShell
      className="buyer-cart-page"
      contentClassName="buyer-cart-shell-content"
      header={<StoreTopBar settings={cartSettings} cartCount={itemCount} />}
      footer={<StoreFooter />}
    >
      <header className="buyer-cart-page-header"><div><p>Your basket</p><h1>Shopping cart</h1></div><a href="/store">Continue shopping</a></header>
      <CartPageStatus loading={loading} error={loadError} empty={empty} onRetry={() => setLoadVersion((version) => version + 1)} />

      {!loading && !loadError && cart && items.length ? (
        <section className="buyer-cart-layout">
          <div className="buyer-cart-list" aria-label="Cart items">
            {items.map((item) => <div key={item.id}><CartItemCard
              item={item}
              currencyCode={cart.currencyCode}
              updating={updatingLineId === item.id}
              error={lineErrors[item.id] || undefined}
              onQuantityChange={(lineId, quantity) => void updateQuantity(lineId, quantity)}
              onDeleteRequest={(lineId) => { setDeleteTargetId(lineId); setDeleteError(undefined) }}
            /></div>)}
          </div>
          <CartSummaryCard cart={cart} />
        </section>
      ) : null}

      {recommendations.length && !loading ? <section className="buyer-cart-recommendations-new"><header><p>More to discover</p><h2>Recommended for you</h2></header><div>{recommendations.map((product) => <div key={product.id}><ProductCard product={product} /></div>)}</div></section> : null}

      <CartDeleteConfirm item={deleteTarget} deleting={deleting} error={deleteError} onCancel={() => { if (!deleting) setDeleteTargetId(undefined) }} onConfirm={() => void confirmDelete()} />
    </PageShell>
  )
}
