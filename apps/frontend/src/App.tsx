import { useEffect, useMemo, useState } from "react"
import { AppLayout } from "./components/Layout"
import { Badge, DebugPanel, EmptyState, Loading, Notice, Panel, money, productImage } from "./components/Ui"
import { config, stores } from "./lib/config"
import { session, type BuyerSession, type SellerSession } from "./lib/session"
import { aiWorkerHealth } from "./lib/api/ai"
import { ApiError } from "./lib/api/client"
import { loginAdmin, getAdminMe } from "./lib/api/auth"
import { addLineItem, completeCart, createCart, getCart, removeLineItem, updateLineItem } from "./lib/api/cart"
import { getOrderTracking, getSupplierOrder, listAdminOrders, lookupOrder, mockShipment, pushFulfillment, retrySupplierPay, syncSupplierOrders } from "./lib/api/orders"
import { createAiDraft, getProduct, listCategories, listPlatformProducts, listProducts, publishProduct } from "./lib/api/products"
import { getAdminStoreSettings, getStoreContext, health, saveAdminStoreSettings } from "./lib/api/store"
import { listSupplierProducts, syncS2bBasicProduct } from "./lib/api/supplier"
import type { Cart, CartLineItem, Category, OrderSummary, PlatformProduct, Product, SupplierProduct, SupplierVariant } from "./lib/api/types"

const initialRoute = () => window.location.hash.replace("#/", "") || "home"

const routeTo = (route: string) => {
  window.location.hash = `/${route}`
}

const err = (error: unknown) =>
  error instanceof ApiError ? `${error.status}: ${error.message}` : error instanceof Error ? error.message : String(error)

const isCompletedCartError = (error: unknown) => err(error).toLowerCase().includes("already completed")
const isMissingCartError = (message: string) => /not found|already completed|completed cart/i.test(message)

const paymentLabel = (status?: string | null) =>
  ({
    paid: "Paid",
    captured: "Captured",
    not_paid: "Not paid",
    pending: "Payment pending",
  })[status ?? ""] ?? (status || "Unknown")

const fulfillmentLabel = (status?: string | null) =>
  ({
    waiting: "Waiting for seller fulfillment",
    not_fulfilled: "Not fulfilled",
    shipped: "Shipped",
    fulfilled: "Fulfilled",
    canceled: "Canceled",
    supplier_order_created: "Supplier order created",
    supplier_payment_pending: "Supplier payment pending",
    supplier_paid: "Supplier paid",
    supplier_reviewing: "Supplier reviewing artwork",
    supplier_in_production: "In production",
    supplier_shipped: "Supplier shipped",
    shipment_created: "Shipment created",
  })[status ?? ""] ?? (status || "Unknown")

const textMeta = (metadata: Record<string, unknown> | undefined, keys: string[]) => {
  for (const key of keys) {
    const value = metadata?.[key]
    if (typeof value === "string" && value.trim()) return value
  }
  return ""
}

const hasExplicitBridge = (product?: Product | null) => Boolean(product?.medusa_variant_id)

const addProductToCart = async (storeId: string, variantId: string) => {
  let cartId = session.getCartId(storeId)
  if (!cartId) {
    const cart = await createCart(storeId)
    cartId = cart.cart_id
    session.setCartId(storeId, cartId)
  }

  try {
    return await addLineItem(storeId, cartId, variantId, 1)
  } catch (error) {
    if (!isCompletedCartError(error)) throw error
    session.clearCartId(storeId)
    const cart = await createCart(storeId)
    session.setCartId(storeId, cart.cart_id)
    return addLineItem(storeId, cart.cart_id, variantId, 1)
  }
}

function useAsync<T>(factory: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError("")
    factory()
      .then((value) => mounted && setData(value))
      .catch((e) => mounted && setError(err(e)))
      .finally(() => mounted && setLoading(false))
    return () => {
      mounted = false
    }
  }, deps)
  return { data, error, loading, setData }
}

export default function App() {
  const [route, setRouteState] = useState(initialRoute)
  const [storeId, setStoreId] = useState(session.getBuyer()?.storeId ?? config.defaultStoreId)
  const [buyer, setBuyer] = useState<BuyerSession | null>(() => session.getBuyer())
  const [seller, setSeller] = useState<SellerSession | null>(() => session.getSeller())

  useEffect(() => {
    const handler = () => setRouteState(initialRoute())
    window.addEventListener("hashchange", handler)
    return () => window.removeEventListener("hashchange", handler)
  }, [])

  const setRoute = (next: string) => {
    setRouteState(next)
    routeTo(next)
  }

  const context = { route, setRoute, storeId, setStoreId, buyer, setBuyer, seller, setSeller }
  const page = renderPage(context)

  return (
    <AppLayout route={route} setRoute={setRoute} storeId={storeId} setStoreId={setStoreId} buyer={buyer} seller={seller}>
      {page}
    </AppLayout>
  )
}

type PageContext = {
  route: string
  setRoute: (route: string) => void
  storeId: string
  setStoreId: (storeId: string) => void
  buyer: BuyerSession | null
  setBuyer: (buyer: BuyerSession | null) => void
  seller: SellerSession | null
  setSeller: (seller: SellerSession | null) => void
}

function renderPage(ctx: PageContext) {
  if (ctx.route.startsWith("product/")) return <ProductDetailPage {...ctx} productId={ctx.route.split("/")[1]} />
  if (ctx.route.startsWith("order/")) return <OrderDetailPage {...ctx} orderId={ctx.route.split("/")[1]} />
  if (ctx.route.startsWith("seller-product/")) return <SellerProductEditPage {...ctx} productId={ctx.route.split("/")[1]} />
  if (ctx.route.startsWith("seller-order/")) return <SellerOrderDetailPage {...ctx} orderId={ctx.route.split("/")[1]} />

  switch (ctx.route) {
    case "buyer-login":
      return <BuyerLoginPage {...ctx} />
    case "products":
      return <ProductListPage {...ctx} />
    case "cart":
      return <CartPage {...ctx} />
    case "checkout":
      return <CheckoutPage {...ctx} />
    case "success":
      return <SuccessPage {...ctx} />
    case "failure":
      return <FailurePage {...ctx} />
    case "order-lookup":
      return <OrderLookupPage {...ctx} />
    case "seller-login":
      return <SellerLoginPage {...ctx} />
    case "seller-dashboard":
      return <SellerDashboardPage {...ctx} />
    case "seller-ai":
      return <SellerAiPage {...ctx} />
    case "seller-review":
      return <DraftReviewPage />
    case "seller-products":
      return <SellerProductListPage {...ctx} />
    case "seller-orders":
      return <SellerOrderListPage {...ctx} />
    case "seller-settings":
      return <StoreSettingsPage {...ctx} />
    case "seller-diagnostics":
      return <DiagnosticsPage {...ctx} />
    default:
      return <HomePage {...ctx} />
  }
}

function ProductCard({ product, setRoute }: { product: Product; setRoute: (route: string) => void }) {
  return (
    <article className="product-card">
      <img src={productImage(product.image_url ?? product.mockup_image_url)} alt={product.title} />
      <div>
        <h3>{product.title}</h3>
        <p>{product.description || "AI-ready product surface for CitiGoo storefront demos."}</p>
        <div className="row">
          <strong>{money(product.price)}</strong>
          <Badge tone={product.is_cart_addable ? "good" : "warn"}>{product.is_cart_addable ? "Cart-addable" : "Preview only"}</Badge>
        </div>
        <button onClick={() => setRoute(`product/${product.product_id}`)}>View product</button>
      </div>
    </article>
  )
}

function HomePage(ctx: PageContext) {
  const { data, loading, error } = useAsync(() => listProducts(ctx.storeId), [ctx.storeId])
  const products = data?.products ?? []
  const recommended = products.slice(0, 3)
  const hot = products.filter((p) => p.is_cart_addable).slice(0, 3)
  const fresh = [...products].slice(0, 3)

  return (
    <div className="page">
      <section className="hero">
        <div>
          <Badge tone="good">Multi-store AI commerce</Badge>
          <h1>CitiGoo turns product ideas into storefront-ready print goods.</h1>
          <p>Buyer storefront and seller workspace are connected to the current Medusa backend with store context, supplier foundation, AI drafts, cart, order, and fulfillment flows.</p>
          <div className="actions">
            <button onClick={() => ctx.setRoute("products")}>Shop products</button>
            <button className="secondary" onClick={() => ctx.setRoute("seller-ai")}>Generate with AI</button>
          </div>
        </div>
      </section>
      {error && <Notice tone="warn">{error}</Notice>}
      {loading ? <Loading /> : (
        <div className="home-grid">
          <Shelf title="Recommended products" products={recommended} setRoute={ctx.setRoute} />
          <Shelf title="New products" products={fresh} setRoute={ctx.setRoute} />
          <Shelf title="Hot products" products={hot} setRoute={ctx.setRoute} />
        </div>
      )}
    </div>
  )
}

function Shelf({ title, products, setRoute }: { title: string; products: Product[]; setRoute: (route: string) => void }) {
  return (
    <Panel title={title}>
      {products.length ? (
        <div className="product-grid compact-grid">{products.map((p) => <ProductCard key={p.product_id} product={p} setRoute={setRoute} />)}</div>
      ) : (
        <EmptyState title="No products yet" detail="Run seed/bootstrap or create an AI product draft from the seller console." />
      )}
    </Panel>
  )
}

function BuyerLoginPage(ctx: PageContext) {
  const [email, setEmail] = useState(ctx.buyer?.email ?? "buyer@example.com")
  return (
    <div className="narrow page">
      <Panel title="Demo buyer login">
        <Notice>Backend buyer/customer auth is not implemented in this custom surface. This demo stores buyer email and store choice in localStorage only.</Notice>
        <label className="field"><span>Email</span><input value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <button onClick={() => {
          const buyer = { email, storeId: ctx.storeId }
          session.setBuyer(buyer)
          ctx.setBuyer(buyer)
          ctx.setRoute("home")
        }}>Continue as demo buyer</button>
      </Panel>
    </div>
  )
}

function ProductListPage(ctx: PageContext) {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")
  const [sort, setSort] = useState("new")
  const products = useAsync(() => listProducts(ctx.storeId), [ctx.storeId])
  const categories = useAsync(() => listCategories(ctx.storeId), [ctx.storeId])
  const filtered = useMemo(() => {
    let rows = products.data?.products ?? []
    if (search) rows = rows.filter((p) => `${p.title} ${p.description ?? ""} ${(p.tags ?? []).join(" ")}`.toLowerCase().includes(search.toLowerCase()))
    if (category !== "all") rows = rows.filter((p) => (p.category_ids ?? []).includes(category))
    return [...rows].sort((a, b) => sort === "price" ? (a.price ?? 0) - (b.price ?? 0) : String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
  }, [products.data, search, category, sort])

  return (
    <div className="page">
      <div className="page-head"><h1>Products</h1><button onClick={() => ctx.setRoute("buyer-login")}>Buyer login</button></div>
      <div className="toolbar">
        <input placeholder="Search title, tags, description" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">All categories</option>
          {(categories.data?.categories ?? []).map((c: Category) => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="new">Newest</option>
          <option value="price">Price low to high</option>
        </select>
      </div>
      <Notice>
        Category filters use backend product category records and product category_ids. Local data may include smoke-test categories, so these labels are not a curated storefront taxonomy yet.
      </Notice>
      {products.error && <Notice tone="bad">{products.error}</Notice>}
      {products.loading ? <Loading /> : filtered.length ? <div className="product-grid">{filtered.map((p) => <ProductCard key={p.product_id} product={p} setRoute={ctx.setRoute} />)}</div> : <EmptyState title="No matching products" detail="Try another store, search term, or category." />}
    </div>
  )
}

function ProductDetailPage(ctx: PageContext & { productId: string }) {
  const { data, loading, error } = useAsync(() => getProduct(ctx.storeId, ctx.productId), [ctx.storeId, ctx.productId])
  const [message, setMessage] = useState("")
  const product = data?.product
  const add = async () => {
    if (!product?.medusa_variant_id) return setMessage("This product is missing medusa_variant_id, so it cannot be added to cart.")
    try {
      await addProductToCart(ctx.storeId, product.medusa_variant_id)
      setMessage("Added to cart.")
    } catch (e) {
      setMessage(err(e))
    }
  }

  if (loading) return <Loading />
  if (error) return <Notice tone="bad">{error}</Notice>
  if (!product) return <EmptyState title="Product not found" detail="It may belong to a different store." />

  return (
    <div className="page detail">
      <img className="detail-image" src={productImage(product.mockup_image_url ?? product.image_url)} alt={product.title} />
      <Panel title={product.title}>
        <div className="badge-row">
          <Badge tone={product.is_cart_addable ? "good" : "warn"}>{product.is_cart_addable ? "Ready for cart" : "Not cart-addable"}</Badge>
          <Badge>{product.source ?? "manual"}</Badge>
        </div>
        <p>{product.description || "No product description yet."}</p>
        <h2>{money(product.price)}</h2>
        <dl className="meta-grid">
          <dt>Supplier</dt><dd>{product.supplier_id ?? "Not linked"}</dd>
          <dt>Supplier product</dt><dd>{product.supplier_product_id ?? "Not linked"}</dd>
          <dt>Supplier variant</dt><dd>{product.supplier_variant_id ?? "Not linked"}</dd>
          <dt>Native variant</dt><dd>{product.medusa_variant_id ?? "Missing"}</dd>
        </dl>
        {product.print_file_url && <a href={product.print_file_url} target="_blank">Open print file</a>}
        <div className="actions">
          <button disabled={!product.is_cart_addable || !product.medusa_variant_id} onClick={add}>Add to cart</button>
          <button className="secondary" onClick={() => ctx.setRoute("cart")}>View cart</button>
        </div>
        {!product.medusa_variant_id && <Notice tone="warn">Frontend add-to-cart uses variant_id = medusa_variant_id. This product cannot be added until the bridge exists.</Notice>}
        {message && <Notice>{message}</Notice>}
        <Panel title="Shipping and returns">
          <p>Shipping uses the current demo fulfillment pipeline. Return policy is a demo placeholder until store policy APIs are expanded.</p>
        </Panel>
      </Panel>
    </div>
  )
}

function CartPage(ctx: PageContext) {
  const cartId = session.getCartId(ctx.storeId)
  const [refresh, setRefresh] = useState(0)
  const [notice, setNotice] = useState("")
  const cart = useAsync(async () => {
    if (!cartId) return null as unknown as Cart
    try {
      return await getCart(ctx.storeId, cartId)
    } catch (error) {
      const message = err(error)
      if (isMissingCartError(message)) {
        session.clearCartId(ctx.storeId)
        setNotice("Previous cart was completed. Start a new cart.")
        return null as unknown as Cart
      }
      throw error
    }
  }, [ctx.storeId, cartId, refresh])
  return (
    <div className="page">
      <div className="page-head"><h1>Cart</h1><button onClick={() => ctx.setRoute("products")}>Continue shopping</button></div>
      {notice && <Notice>{notice}</Notice>}
      {!cartId || !cart.data ? <EmptyState title="Cart is empty" detail="Add a cart-addable product from the storefront." /> : cart.loading ? <Loading /> : cart.error ? <Notice tone="bad">{cart.error}</Notice> : (
        <CartSummary cart={cart.data} storeId={ctx.storeId} refresh={() => setRefresh((value) => value + 1)} checkout={() => ctx.setRoute("checkout")} />
      )}
    </div>
  )
}

function CartSummary({ cart, storeId, refresh, checkout }: { cart: Cart | null; storeId: string; refresh: () => void; checkout: () => void }) {
  const items = cart?.items ?? []
  const total = items.reduce((sum, item) => sum + (item.unit_price ?? 0) * item.quantity, 0)
  const [error, setError] = useState("")
  const changeQty = async (lineId: string, quantity: number) => {
    if (!cart?.cart_id) return
    setError("")
    try {
      await updateLineItem(storeId, cart.cart_id, lineId, quantity)
      refresh()
    } catch (e) {
      setError(err(e))
    }
  }
  const remove = async (lineId: string) => {
    if (!cart?.cart_id) return
    setError("")
    try {
      await removeLineItem(storeId, cart.cart_id, lineId)
      refresh()
    } catch (e) {
      setError(err(e))
    }
  }
  return (
    <Panel title={`Cart ${cart?.cart_id ?? ""}`}>
      {items.length ? items.map((item) => (
        <div className="line-item" key={item.id}>
          <div>
            <strong>{cartItemTitle(item)}</strong>
            {cartItemSubtitle(item) && <span>{cartItemSubtitle(item)}</span>}
            {textMeta(item.metadata, ["print_file_url"]) && <a href={textMeta(item.metadata, ["print_file_url"])} target="_blank">Print file</a>}
          </div>
          <div className="quantity-controls">
            <button disabled={item.quantity <= 1} onClick={() => changeQty(item.id, item.quantity - 1)}>-</button>
            <span>Qty {item.quantity}</span>
            <button onClick={() => changeQty(item.id, item.quantity + 1)}>+</button>
          </div>
          <div>{money((item.unit_price ?? 0) / 100)}</div>
          <button className="secondary" onClick={() => remove(item.id)}>Remove</button>
        </div>
      )) : <EmptyState title="No line items" detail="Quantity update/remove is available, but this cart has no items." />}
      <div className="summary-row"><strong>Estimated total</strong><strong>{money(total / 100)}</strong></div>
      <button disabled={!items.length} onClick={checkout}>Checkout</button>
      {error && <Notice tone="bad">{error}</Notice>}
    </Panel>
  )
}

function cartItemTitle(item: CartLineItem) {
  return textMeta(item.metadata, ["product_title", "mc_product_title", "custom_product_title", "title"]) || item.product_title || item.title || textMeta(item.metadata, ["mc_product_id"]) || "Cart item"
}

function cartItemSubtitle(item: CartLineItem) {
  const customId = textMeta(item.metadata, ["mc_product_id", "product_id"])
  const supplier = textMeta(item.metadata, ["supplier_product_id"])
  const supplierVariant = textMeta(item.metadata, ["supplier_variant_id"])
  const parts = [
    customId ? `Custom product ${customId}` : "",
    supplier ? `Supplier ${supplier}` : "",
    supplierVariant ? `Variant ${supplierVariant}` : "",
    !customId && item.variant_id ? `Native variant ${item.variant_id}` : "",
  ].filter(Boolean)
  return parts.join(" | ")
}

function CheckoutPage(ctx: PageContext) {
  const cartId = session.getCartId(ctx.storeId)
  const [email, setEmail] = useState(ctx.buyer?.email ?? "buyer@example.com")
  const [status, setStatus] = useState("")
  const pay = async () => {
    if (!cartId) return setStatus("No cart found.")
    try {
      const order = await completeCart(ctx.storeId, cartId)
      session.saveOrder({ order_id: order.order_id, display_id: order.display_id, email, store_id: ctx.storeId, payment_status: order.payment_status, fulfillment_status: order.fulfillment_status, created_at: order.created_at })
      window.localStorage.setItem("citigoo.lastOrder", JSON.stringify(order))
      session.clearCartId(ctx.storeId)
      ctx.setRoute("success")
    } catch (e) {
      window.localStorage.setItem("citigoo.paymentFailure", err(e))
      ctx.setRoute("failure")
    }
  }
  return (
    <div className="page two-col">
      <Panel title="Checkout">
        <label className="field"><span>Contact email</span><input value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="field"><span>Shipping address</span><textarea placeholder="Demo placeholder: backend custom route does not require full shipping address." /></label>
        <Notice>Stripe UI is not implemented for this demo. Checkout uses the backend `pp_system_default` payment provider.</Notice>
        <button disabled={!cartId} onClick={pay}>Complete demo payment</button>
        {status && <Notice tone="warn">{status}</Notice>}
      </Panel>
      <CartPage {...ctx} />
    </div>
  )
}

function SuccessPage(ctx: PageContext) {
  const order = JSON.parse(window.localStorage.getItem("citigoo.lastOrder") || "null") as OrderSummary | null
  return (
    <div className="narrow page">
      <Panel title="Payment success">
        <Badge tone="good">Paid</Badge>
        <p>Your demo order was completed through `pp_system_default`.</p>
        <dl className="meta-grid"><dt>Order id</dt><dd>{order?.order_id ?? "Unknown"}</dd><dt>Payment</dt><dd>{paymentLabel(order?.payment_status ?? "paid")}</dd><dt>Fulfillment</dt><dd>{fulfillmentLabel(order?.fulfillment_status ?? "waiting")}</dd></dl>
        {(order?.fulfillment_status ?? "waiting") === "waiting" && <Notice>Payment is complete. The seller has not pushed fulfillment or shipment yet.</Notice>}
        <div className="actions"><button onClick={() => order && ctx.setRoute(`order/${order.order_id}`)}>View logistics</button><button className="secondary" onClick={() => ctx.setRoute("home")}>Return to store</button></div>
      </Panel>
    </div>
  )
}

function FailurePage(ctx: PageContext) {
  return (
    <div className="narrow page">
      <Panel title="Payment failed">
        <Notice tone="bad">{window.localStorage.getItem("citigoo.paymentFailure") || "Payment could not be completed."}</Notice>
        <button onClick={() => ctx.setRoute("checkout")}>Retry checkout</button>
      </Panel>
    </div>
  )
}

function OrderLookupPage(ctx: PageContext) {
  const [email, setEmail] = useState(ctx.buyer?.email ?? "")
  const [displayId, setDisplayId] = useState("")
  const [result, setResult] = useState<unknown>(null)
  const [error, setError] = useState("")
  const recent = session.getOrders().filter((o) => o.store_id === ctx.storeId)
  const lookup = async () => {
    setError("")
    try {
      const order = await lookupOrder(ctx.storeId, email, displayId)
      setResult(order)
    } catch (e) {
      const message = err(e)
      setError(message.includes("403") ? "This demo buyer email is stored locally only. Backend buyer email binding is not implemented yet, so email-protected tracking may not be available for this order." : message)
    }
  }
  return (
    <div className="page two-col">
      <Panel title="Order lookup">
        <label className="field"><span>Email</span><input value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="field"><span>Order number / display id</span><input value={displayId} onChange={(e) => setDisplayId(e.target.value)} /></label>
        <button onClick={lookup}>Lookup order</button>
        {!email && <Notice>Buyer auth is demo-only; recent local orders are shown from localStorage.</Notice>}
        {error && <Notice tone="bad">{error}</Notice>}
        {result && <DebugPanel data={result} />}
      </Panel>
      <Panel title="Recent local orders">
        {recent.length ? recent.map((o) => <button key={o.order_id} className="list-button" onClick={() => ctx.setRoute(`order/${o.order_id}`)}>{o.order_id}</button>) : <EmptyState title="No local orders" detail="Complete a cart to save a local recent order." />}
      </Panel>
    </div>
  )
}

function OrderDetailPage(ctx: PageContext & { orderId: string }) {
  const [email, setEmail] = useState(ctx.buyer?.email ?? "")
  const [tracking, setTracking] = useState<unknown>(null)
  const [error, setError] = useState("")
  const localOrder = session.getOrders().find((o) => o.order_id === ctx.orderId)
  const load = async () => {
    try {
      setError("")
      setTracking(await getOrderTracking(ctx.storeId, ctx.orderId, email))
    } catch (e) {
      const message = err(e)
      setError(message.includes("403") ? "This demo buyer email is stored locally only. Backend buyer email binding is not implemented yet, so email-protected tracking may not be available for this order." : message)
    }
  }
  return (
    <div className="page">
      <Panel title="Order detail and logistics">
        {localOrder && (
          <div className="status-grid">
            <div><span>Order</span><strong>{localOrder.order_id}</strong></div>
            <div><span>Payment</span><strong>{paymentLabel(localOrder.payment_status)}</strong></div>
            <div><span>Fulfillment</span><strong>{fulfillmentLabel(localOrder.fulfillment_status ?? "waiting")}</strong></div>
          </div>
        )}
        {(localOrder?.fulfillment_status ?? "waiting") === "waiting" && <Notice>Payment is complete. The seller has not pushed fulfillment or shipment yet.</Notice>}
        <Notice>Tracking is not available yet. It will appear after seller fulfillment or supplier shipment sync.</Notice>
        <label className="field"><span>Email used for order</span><input value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <button onClick={load}>Load tracking</button>
        {error && <Notice tone="bad">{error}</Notice>}
        {tracking ? <DebugPanel data={tracking} /> : <Notice>Backend email-protected tracking requires the order email to match. Demo buyer email is local-only unless the backend order contains that email.</Notice>}
      </Panel>
    </div>
  )
}

function SellerLoginPage(ctx: PageContext) {
  const [email, setEmail] = useState(ctx.seller?.email ?? "admin@example.com")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const login = async () => {
    try {
      const result = await loginAdmin(email, password)
      const token = result.token ?? result.access_token
      if (!token) throw new Error("Login did not return a token")
      await getAdminMe(token)
      const seller = { email, token }
      session.setSeller(seller)
      ctx.setSeller(seller)
      ctx.setRoute("seller-dashboard")
    } catch (e) {
      setError(err(e))
    }
  }
  return (
    <div className="narrow page">
      <Panel title="Seller/Admin demo login">
        <Notice>Seller is not a separate backend role yet. This demo uses Medusa admin auth and stores the bearer token in localStorage.</Notice>
        <label className="field"><span>Email</span><input value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="field"><span>Password</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <button onClick={login}>Login</button>
        {error && <Notice tone="bad">{error}</Notice>}
      </Panel>
    </div>
  )
}

function SellerDashboardPage(ctx: PageContext) {
  const products = useAsync(() => listProducts(ctx.storeId), [ctx.storeId])
  const orders = useAsync(() => ctx.seller ? listAdminOrders(ctx.storeId, ctx.seller.token) : Promise.resolve({ orders: [], count: 0, store_id: ctx.storeId }), [ctx.storeId, ctx.seller?.token])
  return (
    <div className="page">
      <div className="page-head"><h1>Seller dashboard</h1><button onClick={() => ctx.setRoute(ctx.seller ? "seller-ai" : "seller-login")}>{ctx.seller ? "Create AI product" : "Login"}</button></div>
      <div className="metrics">
        <Metric label="Products" value={products.data?.count ?? 0} />
        <Metric label="Orders" value={orders.data?.count ?? 0} />
        <Metric label="Pending orders" value={(orders.data?.orders ?? []).filter((o) => o.fulfillment_status !== "shipped").length} />
        <Metric label="AI tasks" value={(products.data?.products ?? []).filter((p) => p.source === "ai").length} />
      </div>
      <div className="quick-grid">
        {["seller-ai", "seller-products", "seller-orders", "seller-settings", "seller-diagnostics"].map((key) => <button key={key} onClick={() => ctx.setRoute(key)}>{key.replace("seller-", "").replace("-", " ")}</button>)}
      </div>
      <DiagnosticsPage {...ctx} embedded />
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>
}

function SellerAiPage(ctx: PageContext) {
  const supplier = useAsync(() => listSupplierProducts(ctx.storeId, ctx.seller?.token), [ctx.storeId, ctx.seller?.token])
  const platforms = useAsync(() => listPlatformProducts(ctx.storeId, ctx.seller?.token), [ctx.storeId, ctx.seller?.token])
  const [prompt, setPrompt] = useState("minimal geometric cat t-shirt")
  const [platformId, setPlatformId] = useState("pp_tshirt")
  const [supplierProductId, setSupplierProductId] = useState("sp_tshirt")
  const [supplierVariantId, setSupplierVariantId] = useState("spv_tshirt_black_m")
  const [printPosition, setPrintPosition] = useState("front")
  const [medusaProductId, setMedusaProductId] = useState("")
  const [medusaVariantId, setMedusaVariantId] = useState("")
  const [draft, setDraft] = useState<Product | null>(null)
  const [error, setError] = useState("")
  const [publishMessage, setPublishMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const selectedSupplier = supplier.data?.supplier_products.find((p) => p.supplier_product_id === supplierProductId)
  const variants = selectedSupplier?.variants ?? []
  const generate = async () => {
    if (!ctx.seller) return ctx.setRoute("seller-login")
    setLoading(true)
    setError("")
    setPublishMessage("")
    try {
      const result = await createAiDraft(ctx.storeId, ctx.seller.token, {
        prompt,
        platform_product_id: platformId,
        supplier_product_id: supplierProductId,
        supplier_variant_id: supplierVariantId,
        print_position: printPosition,
        medusa_product_id: medusaProductId || undefined,
        medusa_variant_id: medusaVariantId || undefined,
      })
      setDraft(result.product)
      window.localStorage.setItem("citigoo.lastDraft", JSON.stringify(result.product))
    } catch (e) {
      setError(err(e))
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="page two-col">
      <Panel title="AI product generation">
        {!ctx.seller && <Notice tone="warn">Login as Seller/Admin before calling admin AI routes.</Notice>}
        <label className="field"><span>Prompt / product notes</span><textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} /></label>
        <label className="field"><span>Reference image upload</span><input type="file" disabled /><small>Upload is UI-only; backend currently accepts prompt and product identifiers, not multipart files.</small></label>
        <div className="form-grid">
          <label className="field"><span>Platform product</span><select value={platformId} onChange={(e) => setPlatformId(e.target.value)}>{(platforms.data?.platform_products ?? [{ platform_product_id: "pp_tshirt", title: "T-shirt" }]).map((p: PlatformProduct) => <option key={p.platform_product_id} value={p.platform_product_id}>{p.title}</option>)}</select></label>
          <label className="field"><span>Supplier product</span><select value={supplierProductId} onChange={(e) => setSupplierProductId(e.target.value)}>{(supplier.data?.supplier_products ?? []).map((p: SupplierProduct) => <option key={p.supplier_product_id} value={p.supplier_product_id}>{p.name}</option>)}</select></label>
          <label className="field"><span>Supplier variant</span><select value={supplierVariantId} onChange={(e) => setSupplierVariantId(e.target.value)}>{variants.map((v: SupplierVariant) => <option key={v.supplier_variant_id} value={v.supplier_variant_id}>{v.color} / {v.size}</option>)}</select></label>
          <label className="field"><span>Print position</span><select value={printPosition} onChange={(e) => setPrintPosition(e.target.value)}><option value="front">front</option><option value="back">back</option></select></label>
        </div>
        <details><summary>Optional Phase 1 bridge IDs for cart-addable output</summary><label className="field"><span>Medusa product id</span><input value={medusaProductId} onChange={(e) => setMedusaProductId(e.target.value)} /></label><label className="field"><span>Medusa variant id</span><input value={medusaVariantId} onChange={(e) => setMedusaVariantId(e.target.value)} /></label></details>
        <button disabled={loading} onClick={generate}>{loading ? "Generating..." : "Generate draft"}</button>
        {error && <Notice tone="bad">{error}</Notice>}
      </Panel>
      <DraftPreview product={draft} publish={async () => {
        if (!draft || !ctx.seller) return
        setError("")
        setPublishMessage("")
        const result = await publishProduct(ctx.storeId, ctx.seller.token, draft.product_id)
        setDraft(result.product)
        window.localStorage.setItem("citigoo.lastDraft", JSON.stringify(result.product))
        setPublishMessage("Product published successfully.")
      }} setRoute={ctx.setRoute} publishMessage={publishMessage} />
    </div>
  )
}

function DraftPreview({ product, publish, setRoute, publishMessage }: { product: Product | null; publish: () => Promise<void>; setRoute?: (route: string) => void; publishMessage?: string }) {
  if (!product) return <Panel title="Generated result"><EmptyState title="No draft yet" detail="Generate a product to preview title, mockup, print file, and bridge status." /></Panel>
  return (
    <Panel title="Draft review">
      {publishMessage && <Notice tone="good">{publishMessage}</Notice>}
      <img className="preview" src={productImage(product.mockup_image_url ?? product.image_url)} alt={product.title} />
      <h3>{product.title}</h3>
      <div className="badge-row">
        <Badge tone={product.status === "published" ? "good" : "warn"}>{product.status === "published" ? "Published" : "Draft"}</Badge>
        <Badge tone={product.is_cart_addable && product.medusa_variant_id ? "good" : "warn"}>{product.is_cart_addable && product.medusa_variant_id ? "Ready for cart" : "Not cartable"}</Badge>
      </div>
      <p>{product.description}</p>
      <div className="checklist">
        {[
          ["mockup_image_url", product.mockup_image_url],
          ["print_file_url", product.print_file_url],
          ["supplier_product_id", product.supplier_product_id],
          ["supplier_variant_id", product.supplier_variant_id],
          ["medusa_variant_id", product.medusa_variant_id],
        ].map(([label, value]) => <span key={label as string}>{value ? "✓" : "□"} {label}</span>)}
      </div>
      {hasExplicitBridge(product) && <Notice tone="warn">This product uses an explicit demo Medusa bridge variant. If multiple custom products share that variant, native cart rows may show the bridge product while custom production identity lives in line item metadata.</Notice>}
      {product.status === "published" && !product.medusa_variant_id && <Notice tone="warn">Published but not cartable: missing Medusa variant id.</Notice>}
      <div className="actions">
        <button onClick={publish}>Publish</button>
        {setRoute && <button className="secondary" onClick={() => setRoute(`product/${product.product_id}`)}>View in buyer store</button>}
        <button className="secondary" disabled>Edit API missing</button>
        <button className="secondary" disabled>Draft already saved</button>
      </div>
      <DebugPanel data={product} />
    </Panel>
  )
}

function DraftReviewPage() {
  const product = JSON.parse(window.localStorage.getItem("citigoo.lastDraft") || "null") as Product | null
  return <div className="page"><DraftPreview product={product} publish={async () => undefined} /></div>
}

function SellerProductListPage(ctx: PageContext) {
  const [search, setSearch] = useState("")
  const products = useAsync(() => listProducts(ctx.storeId), [ctx.storeId])
  const rows = (products.data?.products ?? []).filter((p) => p.title.toLowerCase().includes(search.toLowerCase()))
  return (
    <div className="page">
      <div className="page-head"><h1>Seller products</h1><button onClick={() => ctx.setRoute("seller-ai")}>New AI product</button></div>
      <input placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="table-list">{rows.map((p) => <button key={p.product_id} onClick={() => ctx.setRoute(`seller-product/${p.product_id}`)}><strong>{p.title}</strong><span>{p.status}</span><span>{p.is_cart_addable ? "cart-addable" : "not addable"}</span><span>{p.source ?? "manual"}</span></button>)}</div>
    </div>
  )
}

function SellerProductEditPage(ctx: PageContext & { productId: string }) {
  const product = useAsync(() => getProduct(ctx.storeId, ctx.productId), [ctx.storeId, ctx.productId])
  if (product.loading) return <Loading />
  if (product.error) return <Notice tone="bad">{product.error}</Notice>
  const p = product.data?.product
  if (!p) return <EmptyState title="No product" detail="Product not found in this store." />
  return (
    <div className="page two-col">
      <Panel title="Product edit">
        <label className="field"><span>Title</span><input value={p.title} readOnly /></label>
        <label className="field"><span>Description</span><textarea value={p.description ?? ""} readOnly /></label>
        <label className="field"><span>Price</span><input value={p.price ?? ""} readOnly /></label>
        <Notice tone="warn">Product edit API is not implemented yet. This page is read-only until an admin update route exists.</Notice>
      </Panel>
      <Panel title="Supplier fields">
        <dl className="meta-grid">{["supplier_id", "supplier_product_id", "supplier_variant_id", "supplier_material_id", "supplier_size_id", "supplier_color_id", "view_id", "print_file_url", "mockup_image_url"].map((key) => <><dt key={`${key}-k`}>{key}</dt><dd key={key}>{String((p as unknown as Record<string, unknown>)[key] ?? "Not set")}</dd></>)}</dl>
      </Panel>
    </div>
  )
}

function SellerOrderListPage(ctx: PageContext) {
  const orders = useAsync(() => ctx.seller ? listAdminOrders(ctx.storeId, ctx.seller.token) : Promise.resolve({ store_id: ctx.storeId, count: 0, orders: [] }), [ctx.storeId, ctx.seller?.token])
  return (
    <div className="page">
      <div className="page-head"><h1>Orders</h1>{!ctx.seller && <button onClick={() => ctx.setRoute("seller-login")}>Login</button>}</div>
      {orders.error && <Notice tone="bad">{orders.error}</Notice>}
      <div className="table-list">{(orders.data?.orders ?? []).map((o) => <button key={o.order_id ?? String(o.id)} onClick={() => ctx.setRoute(`seller-order/${o.order_id ?? String(o.id)}`)}><strong>{o.order_id ?? String(o.id)}</strong><span>{o.email ?? "buyer"}</span><span>{o.payment_status ?? "unknown"}</span><span>{o.fulfillment_status ?? "unknown"}</span></button>)}</div>
    </div>
  )
}

function SellerOrderDetailPage(ctx: PageContext & { orderId: string }) {
  const [result, setResult] = useState<unknown>(null)
  const [error, setError] = useState("")
  const run = async (action: string) => {
    if (!ctx.seller) return ctx.setRoute("seller-login")
    try {
      const value =
        action === "push" ? await pushFulfillment(ctx.storeId, ctx.seller.token, ctx.orderId) :
        action === "ship" ? await mockShipment(ctx.storeId, ctx.seller.token, ctx.orderId) :
        action === "supplier" ? await getSupplierOrder(ctx.storeId, ctx.seller.token, ctx.orderId) :
        action === "retry" ? await retrySupplierPay(ctx.storeId, ctx.seller.token, ctx.orderId) :
        await syncSupplierOrders(ctx.storeId, ctx.seller.token)
      setResult(value)
    } catch (e) {
      setError(err(e))
    }
  }
  return (
    <div className="page">
      <Panel title={`Order ${ctx.orderId}`}>
        <div className="actions"><button onClick={() => run("push")}>Push fulfillment</button><button onClick={() => run("ship")}>Mock shipment</button><button onClick={() => run("supplier")}>Supplier order</button><button onClick={() => run("retry")}>Retry supplier pay</button><button onClick={() => run("sync")}>Sync supplier status</button></div>
        <Notice>Real supplier fulfillment requires S2BDIY credentials. Without them, supplier pay/sync routes return a configured error and stay disabled operationally.</Notice>
        {error && <Notice tone="bad">{error}</Notice>}
        {result && <DebugPanel data={result} />}
      </Panel>
    </div>
  )
}

function StoreSettingsPage(ctx: PageContext) {
  const settings = useAsync(() => ctx.seller ? getAdminStoreSettings(ctx.storeId, ctx.seller.token) : Promise.resolve({ settings: { store_id: ctx.storeId, brand_name: null, logo_url: null, support_email: null, seo_title: null } }), [ctx.storeId, ctx.seller?.token])
  const [message, setMessage] = useState("")
  const save = async () => {
    if (!ctx.seller || !settings.data) return ctx.setRoute("seller-login")
    try {
      await saveAdminStoreSettings(ctx.storeId, ctx.seller.token, settings.data.settings)
      setMessage("Saved store settings.")
    } catch (e) {
      setMessage(err(e))
    }
  }
  return (
    <div className="page">
      <Panel title="Store settings">
        <label className="field"><span>Store name</span><input defaultValue={settings.data?.settings.brand_name ?? "CitiGoo"} /></label>
        <label className="field"><span>Logo URL</span><input defaultValue={settings.data?.settings.logo_url ?? ""} /></label>
        <label className="field"><span>Banner</span><input placeholder="Stored in metadata in future backend iterations" /></label>
        <label className="field"><span>Brand intro</span><textarea placeholder="Demo brand intro" /></label>
        <label className="field"><span>Customer service email</span><input defaultValue={settings.data?.settings.support_email ?? ""} /></label>
        <label className="field"><span>Basic SEO</span><input defaultValue={settings.data?.settings.seo_title ?? ""} /></label>
        <button onClick={save}>Save supported settings</button>
        {message && <Notice>{message}</Notice>}
      </Panel>
    </div>
  )
}

function DiagnosticsPage(ctx: PageContext & { embedded?: boolean }) {
  const [rows, setRows] = useState<Array<[string, string, string]>>([])
  const run = async () => {
    const output: Array<[string, string, string]> = []
    let defaultProductsOk = false
    let testProductsOk = false
    const browserFetchMessage = "Browser could not fetch this route. This is often a CORS issue, not necessarily backend downtime."
    try {
      await listProducts(config.defaultStoreId)
      defaultProductsOk = true
      output.push(["Medusa Store API", "PASS", "Store API is reachable with publishable key and X-Store-Id."])
      output.push(["default_store products", "PASS", "default_store product list is accessible."])
    } catch (e) {
      output.push(["Medusa Store API", "WARN", err(e)])
      output.push(["default_store products", "WARN", err(e)])
    }
    try {
      await listProducts(config.testStoreId)
      testProductsOk = true
      output.push(["test_store products", "PASS", "test_store product list is accessible."])
    } catch (e) {
      output.push(["test_store products", "WARN", err(e)])
    }
    output.push(["Store context via Store API", defaultProductsOk && testProductsOk ? "PASS" : "WARN", defaultProductsOk && testProductsOk ? "Both store-scoped product calls work." : "One or more store-scoped product calls failed."])
    try {
      await health()
      output.push(["Medusa /health route", "PASS", "Direct health route is reachable."])
    } catch {
      output.push(["Medusa /health route", defaultProductsOk ? "WARN" : "WARN", defaultProductsOk ? "Health route is not CORS-enabled in browser; Store API is reachable." : browserFetchMessage])
    }
    try {
      await getStoreContext(ctx.storeId)
      output.push(["/store-context route", "PASS", "Direct store-context route is reachable."])
    } catch {
      output.push(["/store-context route", defaultProductsOk && testProductsOk ? "WARN" : "WARN", defaultProductsOk && testProductsOk ? "Store context route may be browser/CORS blocked; store-scoped Store API calls are reachable." : browserFetchMessage])
    }
    try {
      await aiWorkerHealth()
      output.push(["AI Worker health", "PASS", "Available"])
    } catch (e) {
      output.push(["AI Worker health", "WARN", err(e)])
    }
    try {
      await listSupplierProducts(ctx.storeId, ctx.seller?.token)
      output.push(["Supplier foundation", "PASS", "Supplier products, variants, print specs, and templates are available."])
    } catch (e) {
      output.push(["Supplier foundation", "WARN", err(e)])
    }
    try {
      if (!ctx.seller) throw new Error("Seller/Admin token missing")
      await getAdminMe(ctx.seller.token)
      output.push(["Admin token", "PASS", "Bearer token accepted by /admin/users/me."])
    } catch (e) {
      output.push(["Admin token", "WARN", err(e)])
    }
    output.push(["Phase 2B supplier credentials", "SKIPPED", "Frontend cannot read server-side S2BDIY credentials; real supplier flow is disabled unless backend is configured."])
    output.push(["Product-cart bridge identity", "WARN", "Current cart bridge may use a shared native Medusa variant; product-specific identity is stored in line item metadata when the backend provides it. Backend follow-up: create or bind one native product/variant per published custom product."])
    setRows(output)
  }
  return (
    <div className={ctx.embedded ? "" : "page"}>
      <Panel title="Backend feature detection" action={<button onClick={run}>Run checks</button>}>
        {rows.length ? rows.map(([name, status, detail]) => <div className="diagnostic" key={name}><strong>{name}</strong><Badge tone={status === "PASS" ? "good" : "warn"}>{status}</Badge><span>{detail}</span></div>) : <EmptyState title="No checks run" detail="Run checks to validate backend readiness for the demo." />}
      </Panel>
    </div>
  )
}
