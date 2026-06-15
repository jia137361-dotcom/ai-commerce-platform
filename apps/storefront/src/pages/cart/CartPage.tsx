import { useEffect, useMemo, useState } from "react"
import { CartDeleteConfirm } from "../../components/cart/CartDeleteConfirm"
import { CartEmptyState } from "../../components/cart/CartEmptyState"
import { CartLine } from "../../components/cart/CartLine"
import { CartSummary } from "../../components/cart/CartSummary"
import { StoreProductGrid } from "../../components/store-home/StoreProductGrid"
import {
  deleteCartLineItem,
  fetchCart,
  fetchProducts,
  getBuyerCartStorageKey,
  getBuyerStoreId,
} from "../../lib/buyer-api"
import { updateCartLineItem } from "../../lib/buyer-api"
import type { CartLineItem, StoreCart, StoreProduct } from "../../lib/mock-data"

type CartPageProps = {
  onCartUpdated: (cart: StoreCart | null) => void
}

export function CartPage({ onCartUpdated }: CartPageProps) {
  const [cart, setCart] = useState<StoreCart | null>(null)
  const [recommendations, setRecommendations] = useState<StoreProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | undefined>()
  const [updatingLineId, setUpdatingLineId] = useState<string | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<CartLineItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const storeId = getBuyerStoreId()
  const storageKey = getBuyerCartStorageKey(storeId)

  const loadCart = async () => {
    setLoading(true)
    setError(undefined)
    const cartId = window.localStorage.getItem(storageKey)

    if (!cartId) {
      setCart(null)
      onCartUpdated(null)
      setLoading(false)
      return
    }

    try {
      const loaded = await fetchCart(cartId)
      setCart(loaded)
      onCartUpdated(loaded)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load cart.")
      setCart(null)
      onCartUpdated(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadCart()
    void fetchProducts().then((result) => {
      if (result.source === "backend") {
        setRecommendations(result.data.slice(0, 6))
      }
    })
  }, [])

  const itemCount = useMemo(() => cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0, [cart])

  const updateQuantity = async (lineId: string, quantity: number) => {
    if (!cart?.id) return
    setUpdatingLineId(lineId)
    setError(undefined)
    try {
      const updated = await updateCartLineItem(cart.id, lineId, quantity)
      setCart(updated)
      onCartUpdated(updated)
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update item quantity.")
    } finally {
      setUpdatingLineId(undefined)
    }
  }

  const confirmDelete = async () => {
    if (!cart?.id || !deleteTarget) return
    setDeleting(true)
    setError(undefined)
    try {
      const updated = await deleteCartLineItem(cart.id, deleteTarget.id)
      setCart(updated)
      onCartUpdated(updated)
      setDeleteTarget(null)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete this item.")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="buyer-cart-page">
      <main className="buyer-cart-main">
        {loading ? (
          <section className="buyer-cart-loading" role="status">Loading cart...</section>
        ) : !cart || !cart.items.length ? (
          <>
            {error && <CartError message={error} onRetry={() => void loadCart()} />}
            <CartEmptyState />
          </>
        ) : (
          <section className="buyer-cart-layout">
            <div className="buyer-cart-content">
              <section className="buyer-cart-panel">
                <header className="buyer-cart-header">
                  <div>
                    <h1>Shopping Cart</h1>
                    <button type="button">Deselect all items</button>
                  </div>
                  <span>Price</span>
                </header>
                {error && <CartError message={error} onRetry={() => void loadCart()} />}
                <div className="buyer-cart-lines">
                  {cart.items.map((item) => (
                    <div className="buyer-cart-line-shell" key={item.id}>
                      <CartLine
                        item={item}
                        currencyCode={cart.currencyCode}
                        updating={updatingLineId === item.id}
                        onQuantityChange={(lineId, quantity) => void updateQuantity(lineId, quantity)}
                        onDeleteRequest={setDeleteTarget}
                      />
                    </div>
                  ))}
                </div>
                <div className="buyer-cart-subtotal-line">
                  <span>Subtotal ({itemCount} items):</span>
                  <strong>{cart.total.toLocaleString(undefined, { style: "currency", currency: cart.currencyCode.toUpperCase() })}</strong>
                </div>
              </section>

              <section className="buyer-cart-saved">
                <h2>Your Items</h2>
                <nav>
                  <span>No items saved for later</span>
                  <button type="button">Buy it again</button>
                </nav>
                <p>No items</p>
              </section>
            </div>
            <CartSummary cart={cart} />
          </section>
        )}

        {recommendations.length > 0 && (
          <section className="buyer-cart-recommendations">
            <header>
              <h2>Recommendations based on items in your cart</h2>
              <span>Page 1 of 5</span>
            </header>
            <StoreProductGrid products={recommendations} />
          </section>
        )}
      </main>

      <footer className="buyer-cart-footer">
        <section>
          <h2>Citigoo</h2>
          <p><strong>Hongkong:</strong> Citigoo Limited,<br />Rm 1805-06, 18/F, Hollywood<br />Plaza, 610 Nathan Road,<br />Kowloon, HK</p>
        </section>
        <section>
          <h2>Information</h2>
          <a href="/about">About Us</a>
          <a href="/store/about">Policies</a>
          <a href="/store">Affiliate & Influencer Program</a>
        </section>
        <section>
          <h2>Customer Service</h2>
          <a href="/help">Refund And Replacement</a>
          <a href="/help">Shipping Information</a>
          <a href="/help">Payment Method</a>
          <a href="/account/orders">Order Status</a>
        </section>
        <section>
          <h2>Help</h2>
          <a href="/help">Help Center</a>
          <a href="/help">Contact Us</a>
          <a href="/help">Citigoo Purchase Protection</a>
        </section>
        <div className="buyer-cart-legal">
          <span>© 2024 Citigoo Limited</span>
          <a href="/terms">Term of Service</a>
          <a href="/privacy">Privacy policy</a>
          <span>AMEX MC PayPal DISC Visa</span>
        </div>
      </footer>

      {deleteTarget && (
        <CartDeleteConfirm
          item={deleteTarget}
          deleting={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => void confirmDelete()}
        />
      )}
    </div>
  )
}

function CartError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section className="buyer-cart-error" role="alert">
      <strong>Cart is unavailable</strong>
      <p>{message}</p>
      <button type="button" onClick={onRetry}>Retry</button>
    </section>
  )
}
