import { useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { AccountSidebar } from "./components/account/AccountSidebar"
import { TopNav } from "./components/layout/TopNav"
import { StoreFooter } from "./components/layout/StoreFooter"
import { ShareModal } from "./components/modals/ShareModal"
import { ConfirmReceiptModal } from "./components/modals/ConfirmReceiptModal"
import { OrderCard } from "./components/orders/OrderCard"
import { OrderTimeline } from "./components/orders/OrderTimeline"
import { orders, type Order, type StoreCart, type StoreProduct } from "./lib/mock-data"
import {
  addCartLineItem,
  cartStorageKey,
  createStoreCart,
  deleteCartLineItem,
  fetchStoreCart,
  updateCartLineItem,
} from "./lib/store-api"
import { CartPage } from "./pages/cart/CartPage"
import { CheckoutPage } from "./pages/checkout/CheckoutPage"
import { CheckoutSuccessPage } from "./pages/checkout/CheckoutSuccessPage"
import { OrderDetailPage } from "./pages/orders/OrderDetailPage"
import { OrderHistoryPage } from "./pages/orders/OrderHistoryPage"
import { OrderLookupPage } from "./pages/orders/OrderLookupPage"
import { OrderTrackingPage } from "./pages/orders/OrderTrackingPage"
import { ProductDetailPage } from "./pages/product/ProductDetailPage"
import { StoreHomePage } from "./pages/store/StoreHomePage"

function App() {
  const [path, setPath] = useState(window.location.pathname)
  const [cart, setCart] = useState<StoreCart | null>(null)
  const [cartLoading, setCartLoading] = useState(false)
  const [cartError, setCartError] = useState<string | undefined>()
  const [shareOpen, setShareOpen] = useState(false)

  useEffect(() => {
    const onPop = () => {
      setPath(window.location.pathname)
    }
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [])

  const loadCart = async () => {
    const cartId = window.localStorage.getItem(cartStorageKey)
    if (!cartId) {
      setCart(null)
      return
    }
    setCartLoading(true)
    setCartError(undefined)
    try {
      setCart(await fetchStoreCart(cartId))
    } catch (error) {
      setCartError(error instanceof Error ? error.message : String(error))
    } finally {
      setCartLoading(false)
    }
  }

  useEffect(() => {
    loadCart()
  }, [])

  const ensureCart = async () => {
    if (cart?.id) return cart
    const stored = window.localStorage.getItem(cartStorageKey)
    if (stored) {
      const existing = await fetchStoreCart(stored)
      setCart(existing)
      return existing
    }
    const created = await createStoreCart()
    window.localStorage.setItem(cartStorageKey, created.id)
    setCart(created)
    return created
  }

  const addProductToCart = async (product: StoreProduct, quantity = 1) => {
    if (!product.medusaVariantId) {
      throw new Error("This product is missing a native Medusa variant_id.")
    }
    const currentCart = await ensureCart()
    const updated = await addCartLineItem(currentCart.id, product.medusaVariantId, quantity)
    setCart(updated)
  }

  const updateLineQuantity = async (lineId: string, quantity: number) => {
    if (!cart?.id) return
    setCart(await updateCartLineItem(cart.id, lineId, quantity))
  }

  const removeLine = async (lineId: string) => {
    if (!cart?.id) return
    setCart(await deleteCartLineItem(cart.id, lineId))
  }

  const cartCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0

  if (path.startsWith("/products/")) {
    return <ProductDetailPage productId={decodeURIComponent(path.split("/").pop() ?? "")} cartCount={cartCount} onCartUpdated={setCart} />
  }

  if (path.startsWith("/cart")) {
    return <CartPage onCartUpdated={setCart} />
  }

  if (path.startsWith("/checkout/success")) {
    return <CheckoutSuccessPage cartCount={cartCount} />
  }

  if (path.startsWith("/checkout")) {
    return <CheckoutPage cartCount={cartCount} onCartUpdated={setCart} />
  }

  if (path.startsWith("/orders/lookup")) {
    return <OrderLookupPage cartCount={cartCount} />
  }

  if (path.startsWith("/account/orders/") && path.endsWith("/tracking")) {
    return <OrderTrackingPage orderId={decodeURIComponent(path.split("/")[3] ?? "")} cartCount={cartCount} />
  }

  if (path.startsWith("/account/orders/")) {
    return <OrderDetailPage orderId={decodeURIComponent(path.split("/")[3] ?? "")} cartCount={cartCount} />
  }

  if (path.startsWith("/account/orders")) {
    return <OrderHistoryPage cartCount={cartCount} />
  }

  return <StoreHomePage cartCount={cartCount} />
}

const orderTabs = ["All", "Processing", "Shipped", "Delivered", "Reviews", "Returns"]

function OrdersPage() {
  const [tab, setTab] = useState("All")
  const [query, setQuery] = useState("")
  const visibleOrders = useMemo(() => {
    const normalized = tab.toLowerCase()
    return orders.filter((order) => {
      const statusMatch = normalized === "all" || order.status === normalized || (normalized === "reviews" && order.status === "delivered")
      const queryMatch = !query.trim() || `${order.id} ${order.storeName} ${order.items.map((item) => item.title).join(" ")}`.toLowerCase().includes(query.toLowerCase())
      return statusMatch && queryMatch
    })
  }, [query, tab])

  return (
    <>
      <TopNav />
      <main className="account-layout">
        <AccountSidebar />
        <section className="orders-page">
          <h1>Orders</h1>
          <div className="order-tabs">
            {orderTabs.map((item) => (
              <button className={tab === item ? "active" : ""} type="button" key={item} onClick={() => setTab(item)}>
                {item}
              </button>
            ))}
          </div>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search orders by name or ID..." />
          {visibleOrders.length ? (
            <div className="order-list">
              {visibleOrders.map((order) => (
                <div key={order.id}>
                  <OrderCard order={order} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyOrders />
          )}
        </section>
      </main>
    </>
  )
}

function EmptyOrders() {
  return (
    <div className="empty-orders">
      <div className="empty-illustration">0</div>
      <h2>You have no related orders</h2>
      <p>Can't find the order? Try View All</p>
      <button type="button" onClick={() => window.location.assign("/account/orders")}>View all</button>
    </div>
  )
}

function OrderDetailsPage({
  orderId,
  onShare,
  shareOpen,
  setShareOpen,
}: {
  orderId: string
  onShare: () => void
  shareOpen: boolean
  setShareOpen: (open: boolean) => void
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const order = orders.find((item) => item.id === orderId) ?? orders[0]

  return (
    <>
      <TopNav onShare={onShare} />
      <main className="detail-page">
        <div className="detail-title">
          <a href="/account/orders">Back to Orders</a>
          <h1>Order Details</h1>
          <p>Order ID: {order.id} | Placed {order.placedAt}</p>
        </div>
        <OrderTimeline delivered={order.status === "delivered"} />
        <section className="detail-grid">
          <div className="detail-main">
            <ShippingStatus order={order} onConfirm={() => setConfirmOpen(true)} />
            <InfoCard title="Delivery Address">
              <strong>{order.address.name}</strong>
              <p>{order.address.line1}</p>
              <p>{order.address.line2}</p>
              <span>{order.address.phone}</span>
            </InfoCard>
            <InfoCard title="Latest Milestone">
              <p>{order.milestone}</p>
              <span>Tracking number: {order.tracking}</span>
            </InfoCard>
            <InfoCard title="Package Contents">
              <div className="package-list">
                {order.items.map((item) => (
                  <div className="package-item" key={item.id}>
                    <img src={item.imageUrl} alt={item.title} />
                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.price} x {item.quantity}</span>
                    </div>
                  </div>
                ))}
              </div>
            </InfoCard>
          </div>
          <aside className="detail-side">
            <InfoCard title="Payment Details">
              <Line label="Subtotal" value={order.payment.subtotal} />
              <Line label="Shipping" value={order.payment.shipping} />
              <Line label="Discount" value={order.payment.discount} />
              <Line label="Total" value={order.payment.total} strong />
              <p>{order.payment.method}</p>
            </InfoCard>
            <InfoCard title="Order Information">
              <Line label="Store" value={order.storeName} />
              <Line label="Status" value={order.status.toUpperCase()} />
              <Line label="Buyer Paid" value={order.paidStatus} />
            </InfoCard>
            <InfoCard title="Quick Actions">
              <div className="quick-actions">
                <button type="button">Support</button>
                <button type="button">Invoice</button>
                <button type="button">Return</button>
                <button type="button" onClick={onShare}>Share</button>
              </div>
            </InfoCard>
          </aside>
        </section>
      </main>
      {confirmOpen && <ConfirmReceiptModal item={order.items[0]} onClose={() => setConfirmOpen(false)} />}
      {shareOpen && <ShareModal onClose={() => setShareOpen(false)} />}
    </>
  )
}

function ShippingStatus({ order, onConfirm }: { order: Order; onConfirm: () => void }) {
  return (
    <section className="shipping-card">
      <span className="status-badge">IN TRANSIT</span>
      <h2>Shipping in progress</h2>
      <p>Estimated delivery is within 3-5 business days. We will update this page as soon as the carrier posts a new scan.</p>
      <div className="shipping-actions">
        <button className="secondary-button" type="button">Track Logistics</button>
        <button type="button" onClick={onConfirm}>Confirm Receipt</button>
      </div>
    </section>
  )
}

function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="info-card">
      <h2>{title}</h2>
      {children}
    </section>
  )
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? "line strong" : "line"}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export default App
