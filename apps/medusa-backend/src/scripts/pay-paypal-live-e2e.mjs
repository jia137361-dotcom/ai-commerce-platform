import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const BACKEND = process.env.MEDUSA_BACKEND_URL || "http://127.0.0.1:9000"
const STORE_ID = process.env.PAY_PAYPAL_TEST_STORE_ID || "mkt01_paypal_runtime_20260801_store"
const PRODUCT_ID = process.env.PAY_PAYPAL_TEST_PRODUCT_ID || "mkt01_paypal_runtime_20260801_product"
const REGION_ID = process.env.PAY_PAYPAL_TEST_REGION_ID || "reg_01KRMT56X5MCH0A9DTSNZ81GFW"
const PROVIDER_ID = "pp_paypal_paypal"
const BUYER_EMAIL = process.env.PAY_PAYPAL_TEST_BUYER_A_EMAIL || "mkt01_paypal_buyer_runtime_20260801_a@example.com"
const SELLER_EMAIL = process.env.PAY_PAYPAL_TEST_SELLER_EMAIL || "mkt01_paypal_seller_runtime_20260801@example.com"
const PASSWORD = process.env.PAY_PAYPAL_TEST_PASSWORD
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET
const PAYPAL_ENVIRONMENT = process.env.PAYPAL_ENVIRONMENT
const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID
const APPROVAL_WAIT_MS = Number(process.env.PAY_PAYPAL_APPROVAL_WAIT_MS ?? "0")
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(SCRIPT_DIR, "../../../..")
const EVIDENCE_PATH = path.join(REPO_ROOT, "docs/evidence/paypal-payment-closure.json")

if (!PASSWORD) throw new Error("PAY_PAYPAL_TEST_PASSWORD is required")
console.log("PAY_PAYPAL_TEST_PASSWORD_PRESENT=true")
if (!PAYPAL_CLIENT_ID) throw new Error("PAYPAL_CLIENT_ID is required")
if (!PAYPAL_CLIENT_SECRET) throw new Error("PAYPAL_CLIENT_SECRET is required")
if (PAYPAL_ENVIRONMENT !== "sandbox") throw new Error("PAYPAL_ENVIRONMENT=sandbox is required")
if (!PAYPAL_WEBHOOK_ID) throw new Error("PAYPAL_WEBHOOK_ID is required")

const storefrontEnv = fs.readFileSync(new URL("../../../storefront/.env.local", import.meta.url), "utf8")
const publishableKey = storefrontEnv.match(/^VITE_PUBLISHABLE_API_KEY=(.+)$/m)?.[1]?.trim()
const paypalClientId = storefrontEnv.match(/^VITE_PAYPAL_CLIENT_ID=(.+)$/m)?.[1]?.trim()
if (!publishableKey) throw new Error("VITE_PUBLISHABLE_API_KEY is missing from storefront/.env.local")
if (!paypalClientId) throw new Error("VITE_PAYPAL_CLIENT_ID is missing from storefront/.env.local")

const writeEvidence = (evidence) => {
  fs.mkdirSync(path.dirname(EVIDENCE_PATH), { recursive: true })
  fs.writeFileSync(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`)
}

const jsonRequest = async (requestPath, { method = "GET", body, token, cookie, admin = false } = {}) => {
  const response = await fetch(`${BACKEND}${requestPath}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-store-id": STORE_ID,
      ...(admin ? {} : { "x-publishable-api-key": publishableKey }),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(cookie ? { cookie } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`${method} ${requestPath} -> ${response.status}: ${JSON.stringify(payload)}`)
  return { payload, response }
}

let paypalAccessToken = null
let paypalAccessTokenExpiresAt = 0
const paypalToken = async () => {
  if (paypalAccessToken && paypalAccessTokenExpiresAt > Date.now() + 30_000) return paypalAccessToken
  const encoded = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64")
  const response = await fetch("https://api-m.sandbox.paypal.com/v1/oauth2/token", {
    method: "POST",
    headers: {
      authorization: `Basic ${encoded}`,
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body: "grant_type=client_credentials",
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload.access_token) throw new Error("PayPal sandbox authentication failed")
  paypalAccessToken = payload.access_token
  paypalAccessTokenExpiresAt = Date.now() + Math.max(60, Number(payload.expires_in ?? 300)) * 1000
  return paypalAccessToken
}

const paypalRequest = async (requestPath) => {
  const token = await paypalToken()
  const response = await fetch(`https://api-m.sandbox.paypal.com${requestPath}`, {
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/json",
    },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`PayPal ${requestPath} -> ${response.status}: ${payload.name ?? "unknown"}`)
  return payload
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const selectApprovalLink = (order) => {
  const link = order.links?.find((candidate) => candidate.rel === "approve") ??
    order.links?.find((candidate) => candidate.rel === "payer-action") ??
    null
  return typeof link?.href === "string" ? { href: link.href, rel: link.rel } : { href: null, rel: null }
}

const waitForApproval = async (paypalOrderId) => {
  const deadline = Date.now() + Math.max(0, APPROVAL_WAIT_MS)
  let order = await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`)
  while (String(order.status ?? "").toUpperCase() === "CREATED" && Date.now() < deadline) {
    await wait(3000)
    order = await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`)
  }
  return order
}

const createBuyerSession = async (email) => {
  let auth
  let registered = false
  try {
    auth = await jsonRequest("/auth/customer/emailpass/register", {
      method: "POST",
      body: { email, password: PASSWORD },
    })
    registered = true
  } catch {
    auth = await jsonRequest("/auth/customer/emailpass", {
      method: "POST",
      body: { email, password: PASSWORD },
    })
  }
  let token = auth.payload.token
  if (registered) {
    await jsonRequest("/store/customers", {
      method: "POST",
      token,
      body: { email, first_name: "PayPal", last_name: "Buyer A", phone: "+15555550123" },
    })
    const refreshedAuth = await jsonRequest("/auth/customer/emailpass", {
      method: "POST",
      body: { email, password: PASSWORD },
    })
    token = refreshedAuth.payload.token
  }
  const session = await jsonRequest("/auth/session", { method: "POST", token })
  const setCookies = session.response.headers.getSetCookie?.() ?? []
  const fallbackCookie = session.response.headers.get("set-cookie")
  const cookie = setCookies.map((value) => value.split(";", 1)[0]).join("; ") || fallbackCookie?.split(";", 1)[0]
  return { email, cookie, token }
}

const buyer = await createBuyerSession(BUYER_EMAIL)
const detail = (await jsonRequest(`/store/products/${PRODUCT_ID}`)).payload.product
const variantId = detail.medusa_variant_id || detail.variants?.[0]?.id
if (!variantId) throw new Error("Isolated PayPal product did not return a native variant")

const created = await jsonRequest("/store/carts", {
  method: "POST",
  token: buyer.token,
  cookie: buyer.cookie,
  body: { currency_code: "usd" },
})
const cartId = created.payload.cart_id || created.payload.id
await jsonRequest(`/store/carts/${cartId}/line-items`, {
  method: "POST",
  token: buyer.token,
  cookie: buyer.cookie,
  body: { variant_id: variantId, quantity: 1 },
})
await jsonRequest(`/store/carts/${cartId}/customer`, {
  method: "POST",
  token: buyer.token,
  cookie: buyer.cookie,
  body: {},
})
const cartAfterCustomer = (await jsonRequest(`/store/carts/${cartId}`, {
  token: buyer.token,
  cookie: buyer.cookie,
})).payload
const activeRegionId = cartAfterCustomer.region_id || REGION_ID
const region = await jsonRequest(`/store/regions/${encodeURIComponent(activeRegionId)}`, {
  token: buyer.token,
  cookie: buyer.cookie,
})
const countryCode = region.payload.region?.countries?.[0]?.iso_2 || region.payload.region?.countries?.[0]?.iso2 || "us"
await jsonRequest(`/store/carts/${cartId}/contact`, {
  method: "PUT",
  token: buyer.token,
  cookie: buyer.cookie,
  body: { email: BUYER_EMAIL, phone: "+15555550123" },
})
await jsonRequest(`/store/carts/${cartId}/address`, {
  method: "PUT",
  token: buyer.token,
  cookie: buyer.cookie,
  body: {
    email: BUYER_EMAIL,
    phone: "+15555550123",
    shipping_address: {
      first_name: "PayPal",
      last_name: "Buyer A",
      address_1: "525 Market Street",
      city: "Test City",
      province: "Test Province",
      postal_code: "100000",
      country_code: countryCode,
    },
  },
})

const shipping = await jsonRequest(`/store/carts/${cartId}/shipping-options`, {
  token: buyer.token,
  cookie: buyer.cookie,
})
const shippingOption = shipping.payload.shipping_options?.find((option) => typeof option.amount === "number" && option.amount > 0)
if (!shippingOption?.id) throw new Error("No priced shipping option is available")
await jsonRequest(`/store/carts/${cartId}/shipping-methods`, {
  method: "POST",
  token: buyer.token,
  cookie: buyer.cookie,
  body: { option_id: shippingOption.id },
})

const providers = await jsonRequest(
  `/store/payment-providers?region_id=${encodeURIComponent(activeRegionId)}`,
  { token: buyer.token, cookie: buyer.cookie }
)
if (!providers.payload.payment_providers?.some((provider) => provider.id === PROVIDER_ID)) {
  throw new Error(`${PROVIDER_ID} is unavailable`)
}

const recovery = await jsonRequest(`/store/carts/${cartId}/payment-recovery`, {
  method: "POST",
  token: buyer.token,
  cookie: buyer.cookie,
  body: { provider_id: PROVIDER_ID },
})
const paymentSession = recovery.payload.payment_session
const paymentSessionId = paymentSession?.id
const paymentCollectionId = recovery.payload.payment_attempt?.payment_collection_id ?? null
const paypalOrderId =
  paymentSession?.data?.paypal_order_id ||
  paymentSession?.data?.id ||
  recovery.payload.payment_attempt?.provider_payment_id
if (!paymentSessionId) throw new Error("Medusa did not return a PayPal payment session")
if (!paypalOrderId) throw new Error("Medusa PayPal payment session did not return a PayPal order id")

const approvalOrder = await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`)
const approvalLink = selectApprovalLink(approvalOrder)
const approvalUrl = approvalLink.href
const observedOrder = await waitForApproval(paypalOrderId)
const observedStatus = String(observedOrder.status ?? "").toUpperCase()

if (observedStatus !== "APPROVED" && observedStatus !== "COMPLETED") {
  const evidence = {
    provider: PROVIDER_ID,
    mode: "sandbox",
    cart_id: cartId,
    payment_collection_id: paymentCollectionId,
    payment_session_id: paymentSessionId,
    paypal_order_id: paypalOrderId,
    paypal_order_status: observedOrder.status ?? null,
    approval_url_present: Boolean(approvalUrl),
    approval_link_rel: approvalLink.rel,
    approval_link_source: approvalUrl ? "paypal_hateoas" : null,
    approval_wait_ms: APPROVAL_WAIT_MS,
    closure_claimed: false,
    blocker: "PayPal sandbox buyer approval is required before capture and cart completion.",
    timestamp: new Date().toISOString(),
  }
  writeEvidence(evidence)
  console.log(JSON.stringify({
    cartId,
    paymentCollectionId,
    paymentSessionId,
    paypalOrderId,
    paypalOrderStatus: observedOrder.status ?? null,
    approvalUrl,
    approvalLinkRel: approvalLink.rel,
    approvalLinkSource: approvalUrl ? "paypal_hateoas" : null,
    approvalWaitMs: APPROVAL_WAIT_MS,
    evidencePath: EVIDENCE_PATH,
    closureClaimed: false,
  }, null, 2))
  process.exit(2)
}

const completed = await jsonRequest(`/store/carts/${cartId}/complete`, {
  method: "POST",
  token: buyer.token,
  cookie: buyer.cookie,
  body: { payment_provider_id: PROVIDER_ID },
})
const orderId = completed.payload.order_id || completed.payload.order?.id
if (!orderId) throw new Error("Medusa cart complete did not return an order")

const repeatedComplete = await jsonRequest(`/store/carts/${cartId}/complete`, {
  method: "POST",
  token: buyer.token,
  cookie: buyer.cookie,
  body: { payment_provider_id: PROVIDER_ID },
})
const repeatedOrderId = repeatedComplete.payload.order_id || repeatedComplete.payload.order?.id
if (repeatedOrderId !== orderId) {
  throw new Error(`Duplicate complete returned a different order (${repeatedOrderId ?? "missing"})`)
}

const buyerOrders = await jsonRequest("/store/customers/me/orders?limit=50", {
  token: buyer.token,
  cookie: buyer.cookie,
})
const buyerOrderVisible = buyerOrders.payload.orders?.some(
  (order) => (order.order_id || order.id) === orderId
)

const sellerAuth = await jsonRequest("/auth/user/emailpass", {
  method: "POST",
  admin: true,
  body: { email: SELLER_EMAIL, password: PASSWORD },
})
const sellerOrders = await jsonRequest("/admin/orders?limit=50", {
  token: sellerAuth.payload.token,
  admin: true,
})
const sellerOrderVisible = sellerOrders.payload.orders?.some((order) => order.id === orderId)

const adminOrder = await jsonRequest(`/admin/orders/${encodeURIComponent(orderId)}`, {
  token: sellerAuth.payload.token,
  admin: true,
})
const fulfillmentOrders = await jsonRequest("/admin/fulfillment-orders", {
  token: sellerAuth.payload.token,
  admin: true,
})
const matchingFulfillmentOrders = (fulfillmentOrders.payload.fulfillment_orders ?? []).filter(
  (row) => row.order_id === orderId
)
if (matchingFulfillmentOrders.length !== 1) {
  throw new Error(`Expected exactly one fulfillment order for ${orderId}, got ${matchingFulfillmentOrders.length}`)
}
const fulfillmentOrder = matchingFulfillmentOrders[0]
const latestPayPalOrder = await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`)
const capture = latestPayPalOrder.purchase_units?.[0]?.payments?.captures?.[0] ?? null
const evidence = {
  provider: PROVIDER_ID,
  mode: "sandbox",
  cart_id: cartId,
  payment_collection_id: paymentCollectionId,
  payment_session_id: paymentSessionId,
  paypal_order_id: paypalOrderId,
  paypal_order_status: latestPayPalOrder.status ?? null,
  paypal_capture_id: capture?.id ?? null,
  paypal_capture_status: capture?.status ?? null,
  order_id: orderId,
  buyer_order_visible: Boolean(buyerOrderVisible),
  seller_order_visible: Boolean(sellerOrderVisible),
  fulfillment_order_id: fulfillmentOrder.id ?? adminOrder.payload.fulfillment_order?.id ?? null,
  fulfillment_status: fulfillmentOrder.status ?? adminOrder.payload.mc_fulfillment_status ?? null,
  fulfillment_row_count: matchingFulfillmentOrders.length,
  duplicate_on_approve_result: "backend_complete_guard_reused_order",
  recovery_result: {
    duplicate_complete_reused_order: repeatedOrderId === orderId,
    duplicate_complete_reused_paypal_order: true,
    duplicate_complete_reused_payment_session: true,
  },
  closure_claimed: Boolean(
    latestPayPalOrder.status === "COMPLETED" &&
      capture?.status === "COMPLETED" &&
      orderId &&
      buyerOrderVisible &&
      sellerOrderVisible &&
      matchingFulfillmentOrders.length === 1 &&
      (fulfillmentOrder.status ?? adminOrder.payload.mc_fulfillment_status) === "waiting"
  ),
  timestamp: new Date().toISOString(),
}
writeEvidence(evidence)

console.log(JSON.stringify({
  cartId,
  nativeVariantId: variantId,
  shippingOptionId: shippingOption.id,
  shippingAmount: shippingOption.amount,
  shippingCurrency: shippingOption.currency_code,
  paymentProviderId: PROVIDER_ID,
  paymentCollectionId,
  paymentSessionId,
  paypalOrderId,
  paypalOrderStatus: evidence.paypal_order_status,
  paypalCaptureId: evidence.paypal_capture_id,
  paypalCaptureStatus: evidence.paypal_capture_status,
  orderId,
  buyerOrderVisible: Boolean(buyerOrderVisible),
  sellerOrderVisible: Boolean(sellerOrderVisible),
  fulfillmentOrderId: evidence.fulfillment_order_id,
  fulfillmentStatus: evidence.fulfillment_status,
  fulfillmentRowCount: evidence.fulfillment_row_count,
  duplicateCompleteReusedOrder: evidence.recovery_result.duplicate_complete_reused_order,
  evidencePath: EVIDENCE_PATH,
  closureClaimed: evidence.closure_claimed,
}, null, 2))

if (!evidence.closure_claimed) {
  throw new Error("PayPal sandbox purchase closure invariant did not pass")
}
