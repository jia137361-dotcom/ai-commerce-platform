#!/usr/bin/env node
/**
 * P3/P4 local acceptance: multi-store prepare → per-store complete → linked orders.
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const BACKEND = process.env.MEDUSA_BACKEND_URL || "http://127.0.0.1:9000"
const PASSWORD = process.env.DEV_ACCOUNTS_PASSWORD || "Meng1355026750"
const BUYER_EMAIL = process.env.PLATFORM_CHECKOUT_BUYER_EMAIL || "1355026750@qq.com"
const OPS_EMAIL = process.env.PLATFORM_OPS_EMAIL || "1355026750@qq.com"

const STORE_GROUPS = [
  {
    store_id: "default_store",
    variant_id: "variant_01KVR1WMF16NZD5C7YRNKA1ZNY",
    label: "Default Store",
  },
  {
    store_id: "01KWQ7C99HGZDAFQZ16V2MGYTQ",
    variant_id: "variant_01KWQ8XP35ZWA8R3RB5T95FSG0",
    label: "TshirtPrint",
  },
]

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..")
const storefrontEnv = fs.readFileSync(path.join(repoRoot, "apps/storefront/.env.local"), "utf8")
const publishableKey = storefrontEnv.match(/^VITE_PUBLISHABLE_API_KEY=(.+)$/m)?.[1]?.trim()
if (!publishableKey) throw new Error("VITE_PUBLISHABLE_API_KEY missing in storefront/.env.local")

const results = []
const pass = (step, detail) => {
  results.push({ step, status: "PASS", detail })
  console.log(`✓ ${step}${detail ? `: ${detail}` : ""}`)
}
const fail = (step, error) => {
  results.push({ step, status: "FAIL", detail: String(error) })
  console.error(`✗ ${step}: ${error}`)
  throw error
}

const jsonRequest = async (routePath, { method = "GET", body, token, cookie, admin = false, storeId } = {}) => {
  const headers = { "content-type": "application/json" }
  if (!admin) headers["x-publishable-api-key"] = publishableKey
  if (token) headers.authorization = `Bearer ${token}`
  if (cookie) headers.cookie = cookie
  if (storeId) headers["x-store-id"] = storeId
  const response = await fetch(`${BACKEND}${routePath}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const payload = await response.json().catch(() => ({}))
  return { ok: response.ok, status: response.status, payload, response }
}

const createBuyerSession = async () => {
  const auth = await jsonRequest("/auth/customer/emailpass", {
    method: "POST",
    body: { email: BUYER_EMAIL, password: PASSWORD },
  })
  if (!auth.ok) fail("buyer login", `${auth.status} ${JSON.stringify(auth.payload)}`)
  const token = auth.payload.token
  const session = await jsonRequest("/auth/session", { method: "POST", token })
  if (!session.ok) fail("buyer session", `${session.status}`)
  const setCookies = session.response.headers.getSetCookie?.() ?? []
  const fallbackCookie = session.response.headers.get("set-cookie")
  const cookie = setCookies.map((value) => value.split(";", 1)[0]).join("; ") || fallbackCookie?.split(";", 1)[0]
  if (!cookie) fail("buyer session cookie", "missing")
  pass("buyer login", BUYER_EMAIL)
  return { token, cookie }
}

const createStoreCart = async (buyer, storeId, variantId) => {
  const created = await jsonRequest("/store/carts", {
    method: "POST",
    cookie: buyer.cookie,
    token: buyer.token,
    storeId,
    body: { currency_code: "usd" },
  })
  if (!created.ok) fail(`create cart (${storeId})`, `${created.status} ${JSON.stringify(created.payload)}`)
  const cartId = created.payload.cart_id || created.payload.cart?.id || created.payload.id
  const line = await jsonRequest(`/store/carts/${cartId}/line-items`, {
    method: "POST",
    cookie: buyer.cookie,
    token: buyer.token,
    storeId,
    body: { variant_id: variantId, quantity: 1 },
  })
  if (!line.ok) fail(`add line item (${storeId})`, `${line.status} ${JSON.stringify(line.payload)}`)
  const bind = await jsonRequest(`/store/carts/${cartId}/customer`, {
    method: "POST",
    cookie: buyer.cookie,
    token: buyer.token,
    storeId,
    body: {},
  })
  if (!bind.ok) fail(`bind customer (${storeId})`, `${bind.status}`)
  const cartRes = await jsonRequest(`/store/carts/${cartId}`, { cookie: buyer.cookie, token: buyer.token, storeId })
  if (!cartRes.ok) fail(`fetch cart (${storeId})`, `${cartRes.status}`)
  return { cartId, cart: cartRes.payload.cart ?? cartRes.payload }
}

const prepareCheckoutCart = async (buyer, storeId, cartId, email) => {
  await jsonRequest(`/store/carts/${cartId}/contact`, {
    method: "PUT",
    cookie: buyer.cookie,
    token: buyer.token,
    storeId,
    body: { email, phone: "+15555550123" },
  })
  const cartRes = await jsonRequest(`/store/carts/${cartId}`, { cookie: buyer.cookie, token: buyer.token, storeId })
  const cart = cartRes.payload.cart ?? cartRes.payload
  const region = await jsonRequest(`/store/regions/${encodeURIComponent(cart.region_id)}`, {
    cookie: buyer.cookie,
    token: buyer.token,
    storeId,
  })
  const countryCode = region.payload.region?.countries?.[0]?.iso_2 || "us"
  const address = await jsonRequest(`/store/carts/${cartId}/address`, {
    method: "PUT",
    cookie: buyer.cookie,
    token: buyer.token,
    storeId,
    body: {
      email,
      phone: "+15555550123",
      shipping_address: {
        first_name: "Platform",
        last_name: "Checkout",
        address_1: "525 Market Street",
        city: "San Francisco",
        province: "CA",
        postal_code: "94105",
        country_code: countryCode,
      },
    },
  })
  if (!address.ok) fail(`save address (${storeId})`, `${address.status} ${JSON.stringify(address.payload)}`)
  const shipping = await jsonRequest(`/store/carts/${cartId}/shipping-options`, {
    cookie: buyer.cookie,
    token: buyer.token,
    storeId,
  })
  const option = shipping.payload.shipping_options?.find((entry) => entry.available !== false) ?? shipping.payload.shipping_options?.[0]
  if (!option?.id) fail(`shipping options (${storeId})`, JSON.stringify(shipping.payload))
  const selected = await jsonRequest(`/store/carts/${cartId}/shipping-methods`, {
    method: "POST",
    cookie: buyer.cookie,
    token: buyer.token,
    storeId,
    body: { option_id: option.id },
  })
  if (!selected.ok) fail(`select shipping (${storeId})`, `${selected.status}`)
}

const completeStoreCart = async (buyer, storeId, cartId, platformCheckout) => {
  const complete = await jsonRequest(`/store/carts/${cartId}/complete`, {
    method: "POST",
    cookie: buyer.cookie,
    token: buyer.token,
    storeId,
    body: {
      payment_provider_id: "pp_system_default",
      platform_checkout_id: platformCheckout.platform_checkout_id,
      platform_checkout_index: platformCheckout.platform_checkout_index,
      platform_checkout_count: platformCheckout.platform_checkout_count,
    },
  })
  if (!complete.ok) fail(`complete cart (${storeId})`, `${complete.status} ${JSON.stringify(complete.payload)}`)
  return complete.payload
}

console.log("=== Platform Checkout Acceptance (P3/P4) ===\n")

const health = await jsonRequest("/health")
if (!health.ok) fail("backend health", health.status)
pass("backend health", BACKEND)

const buyer = await createBuyerSession()

const storeCarts = []
for (const group of STORE_GROUPS) {
  const entry = await createStoreCart(buyer, group.store_id, group.variant_id)
  if (!entry.cart.items?.length) fail(`cart items (${group.store_id})`, "empty")
  storeCarts.push({ ...group, ...entry })
  pass(`create cart (${group.label})`, entry.cartId)
}

const prepare = await jsonRequest("/store/platform/checkout/prepare", {
  method: "POST",
  body: {
    groups: storeCarts.map((entry) => ({ store_id: entry.store_id, cart_id: entry.cartId })),
  },
})
if (!prepare.ok) fail("prepare platform checkout", `${prepare.status} ${JSON.stringify(prepare.payload)}`)
const platformCheckoutId = prepare.payload.platform_checkout_id
if (!platformCheckoutId?.startsWith("pc_")) fail("platform checkout id", platformCheckoutId)
pass("prepare platform checkout", `${platformCheckoutId} · ${prepare.payload.group_count} groups`)

const completedOrders = []
for (const group of prepare.payload.groups) {
  const storeCart = storeCarts.find((entry) => entry.store_id === group.store_id)
  if (!storeCart) fail("prepare group mapping", group.store_id)
  await prepareCheckoutCart(buyer, group.store_id, storeCart.cartId, BUYER_EMAIL)
  pass(`checkout prep (${group.store_name})`, storeCart.cartId)
  const completed = await completeStoreCart(buyer, group.store_id, storeCart.cartId, {
    platform_checkout_id: platformCheckoutId,
    platform_checkout_index: group.platform_checkout_index,
    platform_checkout_count: group.platform_checkout_count,
  })
  const orderId = completed.order_id || completed.order?.id
  if (!orderId) fail(`order id (${group.store_id})`, JSON.stringify(completed))
  completedOrders.push({ store_id: group.store_id, order_id: orderId, display_id: completed.order?.display_id ?? completed.display_id })
  pass(`complete order (${group.store_name})`, `#${completedOrders.at(-1).display_id ?? orderId}`)
}

const linked = await jsonRequest(`/store/platform/checkout/${encodeURIComponent(platformCheckoutId)}/orders`)
if (!linked.ok) fail("platform checkout orders API", `${linked.status}`)
if ((linked.payload.order_count ?? linked.payload.orders?.length ?? 0) < 2) {
  fail("platform checkout orders count", JSON.stringify(linked.payload))
}
pass("platform checkout orders API", `${linked.payload.order_count ?? linked.payload.orders.length} orders`)

const myOrders = await jsonRequest("/store/customers/me/orders?scope=platform&limit=50", {
  cookie: buyer.cookie,
  token: buyer.token,
  storeId: "default_store",
})
if (!myOrders.ok) fail("buyer orders scope=platform", `${myOrders.status}`)
const linkedFromHistory = (myOrders.payload.orders ?? []).filter(
  (order) => order.platform_checkout_id === platformCheckoutId
)
if (linkedFromHistory.length < 2) {
  fail("buyer order history grouping source", `found ${linkedFromHistory.length} for ${platformCheckoutId}`)
}
pass("buyer orders scope=platform", `${linkedFromHistory.length} orders share ${platformCheckoutId}`)

const opsAuth = await jsonRequest("/auth/user/emailpass", {
  method: "POST",
  admin: true,
  body: { email: OPS_EMAIL, password: PASSWORD },
})
if (!opsAuth.ok) fail("ops login", `${opsAuth.status}`)
const opsToken = opsAuth.payload.token
const firstOrderId = completedOrders[0].order_id
const opsDetail = await jsonRequest(`/admin/platform/orders/${encodeURIComponent(firstOrderId)}`, {
  token: opsToken,
  admin: true,
})
if (!opsDetail.ok) fail("ops order detail", `${opsDetail.status}`)
const order = opsDetail.payload.order
if (order.platform_checkout_id !== platformCheckoutId) {
  fail("ops platform_checkout_id", `${order.platform_checkout_id} !== ${platformCheckoutId}`)
}
if ((order.related_platform_orders?.length ?? 0) < 1) {
  fail("ops related_platform_orders", JSON.stringify(order.related_platform_orders))
}
pass("ops related orders", `${order.related_platform_orders.length} related order(s)`)

console.log("\n=== Summary ===")
console.log(JSON.stringify({
  platform_checkout_id: platformCheckoutId,
  completed_orders: completedOrders,
  linked_order_count: linked.payload.order_count ?? linked.payload.orders?.length,
  buyer_history_count: linkedFromHistory.length,
  ops_related_count: order.related_platform_orders.length,
  all_steps: results.length,
}, null, 2))
console.log("\nAll acceptance checks passed.")
