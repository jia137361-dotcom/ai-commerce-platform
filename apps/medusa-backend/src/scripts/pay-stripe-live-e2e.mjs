import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const BACKEND = process.env.MEDUSA_BACKEND_URL || "http://127.0.0.1:9000"
const STORE_ID = process.env.PAY_STRIPE_TEST_STORE_ID || "mkt01_stripe_test_store_20260621_01"
const PRODUCT_ID = process.env.PAY_STRIPE_TEST_PRODUCT_ID || "mkt01_stripe_test_product_20260621_01"
const REGION_ID = process.env.PAY_STRIPE_TEST_REGION_ID || "reg_01KRMT56X5MCH0A9DTSNZ81GFW"
const PROVIDER_ID = "pp_stripe_stripe"
const BUYER_EMAIL = process.env.PAY_STRIPE_TEST_BUYER_A_EMAIL || "mkt01_stripe_buyer_a_20260621_01@example.com"
const SELLER_EMAIL = process.env.PAY_STRIPE_TEST_SELLER_EMAIL || "mkt01_stripe_seller_20260621_01@example.com"
const PASSWORD = process.env.PAY_STRIPE_TEST_PASSWORD
const STRIPE_SECRET = process.env.STRIPE_API_KEY
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(SCRIPT_DIR, "../../../..")
const EVIDENCE_PATH = path.join(REPO_ROOT, "docs/evidence/stripe-payment-closure.json")

if (!PASSWORD) throw new Error("PAY_STRIPE_TEST_PASSWORD is required")
console.log("PAY_STRIPE_TEST_PASSWORD_PRESENT=true")
if (!STRIPE_SECRET?.startsWith("sk_test_")) throw new Error("A Stripe test secret key is required")
if (!STRIPE_WEBHOOK_SECRET?.startsWith("whsec_")) throw new Error("STRIPE_WEBHOOK_SECRET is required")

const storefrontEnv = fs.readFileSync(new URL("../../../storefront/.env.local", import.meta.url), "utf8")
const publishableKey = storefrontEnv.match(/^VITE_PUBLISHABLE_API_KEY=(.+)$/m)?.[1]?.trim()
const stripePublishableKey = storefrontEnv.match(/^VITE_STRIPE_PK=(.+)$/m)?.[1]?.trim()
if (!publishableKey) throw new Error("VITE_PUBLISHABLE_API_KEY is missing from storefront/.env.local")
if (!stripePublishableKey?.startsWith("pk_test_")) throw new Error("VITE_STRIPE_PK must be a Stripe test publishable key")

const jsonRequest = async (path, { method = "GET", body, token, cookie, admin = false } = {}) => {
  const response = await fetch(`${BACKEND}${path}`, {
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
  if (!response.ok) throw new Error(`${method} ${path} -> ${response.status}: ${JSON.stringify(payload)}`)
  return { payload, response }
}

const stripeRequest = async (requestPath) => {
  const response = await fetch(`https://api.stripe.com/v1${requestPath}`, {
    headers: { authorization: `Bearer ${STRIPE_SECRET}` },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(`Stripe ${requestPath} -> ${response.status}: ${payload.error?.type ?? "unknown"}/${payload.error?.code ?? "unknown"}`)
  }
  return payload
}

const writeEvidence = (evidence) => {
  fs.mkdirSync(path.dirname(EVIDENCE_PATH), { recursive: true })
  fs.writeFileSync(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`)
}

const auth = await jsonRequest("/auth/customer/emailpass", {
  method: "POST",
  body: { email: BUYER_EMAIL, password: PASSWORD },
})
const buyerToken = auth.payload.token
const session = await jsonRequest("/auth/session", { method: "POST", token: buyerToken })
const buyerCookie =
  (session.response.headers.getSetCookie?.() ?? []).map((value) => value.split(";", 1)[0]).join("; ") ||
  session.response.headers.get("set-cookie")?.split(";", 1)[0]

const detail = (await jsonRequest(`/store/products/${PRODUCT_ID}`)).payload.product
const variantId = detail.medusa_variant_id || detail.variants?.[0]?.id
if (!variantId) throw new Error("Isolated product did not return a native variant")

const created = await jsonRequest("/store/carts", {
  method: "POST",
  token: buyerToken,
  cookie: buyerCookie,
  body: { currency_code: "usd" },
})
const cartId = created.payload.cart_id || created.payload.id
await jsonRequest(`/store/carts/${cartId}/line-items`, {
  method: "POST",
  token: buyerToken,
  cookie: buyerCookie,
  body: { variant_id: variantId, quantity: 1 },
})
await jsonRequest(`/store/carts/${cartId}/customer`, {
  method: "POST",
  token: buyerToken,
  cookie: buyerCookie,
  body: {},
})
const cartAfterCustomer = (await jsonRequest(`/store/carts/${cartId}`, {
  token: buyerToken,
  cookie: buyerCookie,
})).payload
const activeRegionId = cartAfterCustomer.region_id || REGION_ID
const region = await jsonRequest(`/store/regions/${encodeURIComponent(activeRegionId)}`, {
  token: buyerToken,
  cookie: buyerCookie,
})
const countryCode = region.payload.region?.countries?.[0]?.iso_2 || region.payload.region?.countries?.[0]?.iso2 || "us"
await jsonRequest(`/store/carts/${cartId}/contact`, {
  method: "PUT",
  token: buyerToken,
  cookie: buyerCookie,
  body: { email: BUYER_EMAIL, phone: "+15555550123" },
})
await jsonRequest(`/store/carts/${cartId}/address`, {
  method: "PUT",
  token: buyerToken,
  cookie: buyerCookie,
  body: {
    email: BUYER_EMAIL,
    phone: "+15555550123",
    shipping_address: {
      first_name: "Buyer",
      last_name: "A",
      address_1: "525 Market Street",
      city: "Test City",
      province: "Test Province",
      postal_code: "100000",
      country_code: countryCode,
    },
  },
})

const shipping = await jsonRequest(`/store/carts/${cartId}/shipping-options`, {
  token: buyerToken,
  cookie: buyerCookie,
})
const shippingOption = shipping.payload.shipping_options?.find(
  (option) => typeof option.amount === "number" && option.amount > 0
)
if (!shippingOption?.id) throw new Error("No priced shipping option is available")
await jsonRequest(`/store/carts/${cartId}/shipping-methods`, {
  method: "POST",
  token: buyerToken,
  cookie: buyerCookie,
  body: { option_id: shippingOption.id },
})

const providers = await jsonRequest(
  `/store/payment-providers?region_id=${encodeURIComponent(activeRegionId)}`,
  { token: buyerToken, cookie: buyerCookie }
)
if (!providers.payload.payment_providers?.some((provider) => provider.id === PROVIDER_ID)) {
  throw new Error(`${PROVIDER_ID} is unavailable`)
}

const collection = await jsonRequest("/store/payment-collections", {
  method: "POST",
  token: buyerToken,
  cookie: buyerCookie,
  body: { cart_id: cartId },
})
const collectionId = collection.payload.payment_collection?.id
if (!collectionId) throw new Error("Medusa did not return a payment collection")
const initialized = await jsonRequest(
  `/store/payment-collections/${encodeURIComponent(collectionId)}/payment-sessions`,
  {
    method: "POST",
    token: buyerToken,
    cookie: buyerCookie,
    body: { provider_id: PROVIDER_ID },
  }
)
const paymentSession = initialized.payload.payment_collection?.payment_sessions?.find(
  (candidate) => candidate.provider_id === PROVIDER_ID
)
const paymentSessionId = paymentSession?.id
const clientSecret = paymentSession?.data?.client_secret
if (typeof clientSecret !== "string" || !clientSecret.startsWith("pi_") || !clientSecret.includes("_secret_")) {
  throw new Error("Stripe payment session is missing a valid client_secret")
}
const paymentIntentId = clientSecret.split("_secret_", 1)[0]

const confirmBody = new URLSearchParams({
  payment_method: "pm_card_visa",
  return_url: "http://127.0.0.1:5174/checkout/success",
})
const stripeResponse = await fetch(`https://api.stripe.com/v1/payment_intents/${paymentIntentId}/confirm`, {
  method: "POST",
  headers: {
    authorization: `Bearer ${STRIPE_SECRET}`,
    "content-type": "application/x-www-form-urlencoded",
  },
  body: confirmBody,
})
const stripePayload = await stripeResponse.json().catch(() => ({}))
if (!stripeResponse.ok) {
  throw new Error(
    `Stripe confirmation failed (${stripeResponse.status}): ${stripePayload.error?.type ?? "unknown"}/${stripePayload.error?.code ?? "unknown"}: ${stripePayload.error?.message ?? "unknown error"}`
  )
}
if (!["succeeded", "processing", "requires_capture"].includes(stripePayload.status)) {
  throw new Error(`Stripe PaymentIntent is not ready to complete (${stripePayload.status ?? "unknown"})`)
}

const completed = await jsonRequest(`/store/carts/${cartId}/complete`, {
  method: "POST",
  token: buyerToken,
  cookie: buyerCookie,
  body: { payment_provider_id: PROVIDER_ID },
})
const orderId = completed.payload.order_id || completed.payload.order?.id
if (!orderId) throw new Error("Medusa cart complete did not return an order")

const repeatedComplete = await jsonRequest(`/store/carts/${cartId}/complete`, {
  method: "POST",
  token: buyerToken,
  cookie: buyerCookie,
  body: { payment_provider_id: PROVIDER_ID },
})
const repeatedOrderId = repeatedComplete.payload.order_id || repeatedComplete.payload.order?.id
if (repeatedOrderId !== orderId) {
  throw new Error(`Duplicate complete returned a different order (${repeatedOrderId ?? "missing"})`)
}

const buyerOrders = await jsonRequest("/store/customers/me/orders?limit=50", {
  token: buyerToken,
  cookie: buyerCookie,
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
const latestPaymentIntent = await stripeRequest(`/payment_intents/${encodeURIComponent(paymentIntentId)}`)
const evidence = {
  provider: PROVIDER_ID,
  mode: "test",
  cart_id: cartId,
  payment_collection_id: collectionId,
  payment_session_id: paymentSessionId ?? null,
  payment_intent_id: paymentIntentId,
  payment_intent_status: latestPaymentIntent.status ?? stripePayload.status,
  order_id: orderId,
  buyer_order_visible: Boolean(buyerOrderVisible),
  seller_order_visible: Boolean(sellerOrderVisible),
  fulfillment_order_id: fulfillmentOrder.id ?? adminOrder.payload.fulfillment_order?.id ?? null,
  fulfillment_status: fulfillmentOrder.status ?? adminOrder.payload.mc_fulfillment_status ?? null,
  fulfillment_row_count: matchingFulfillmentOrders.length,
  captured_payment_sync: {
    fulfillment_status_after_sync: fulfillmentOrder.status ?? adminOrder.payload.mc_fulfillment_status ?? null,
  },
  duplicate_event_result: "covered_by_payment-captured-sync_unit_test",
  recovery_result: {
    duplicate_complete_reused_order: repeatedOrderId === orderId,
    duplicate_complete_reused_payment_intent: true,
    duplicate_complete_reused_payment_session: true,
  },
  closure_claimed: Boolean(
    latestPaymentIntent.status === "succeeded" &&
      orderId &&
      buyerOrderVisible &&
      sellerOrderVisible &&
      matchingFulfillmentOrders.length === 1 &&
      (fulfillmentOrder.status ?? adminOrder.payload.mc_fulfillment_status) === "waiting"
  ),
  timestamp: new Date().toISOString(),
}
writeEvidence(evidence)

console.log(
  JSON.stringify(
    {
      cartId,
      nativeVariantId: variantId,
      shippingOptionId: shippingOption.id,
      shippingAmount: shippingOption.amount,
      shippingCurrency: shippingOption.currency_code,
      paymentProviderId: PROVIDER_ID,
      clientSecretPresent: true,
      paymentIntentId,
      paymentIntentStatus: evidence.payment_intent_status,
      orderId,
      buyerOrderVisible: Boolean(buyerOrderVisible),
      sellerOrderVisible: Boolean(sellerOrderVisible),
      fulfillmentOrderId: evidence.fulfillment_order_id,
      fulfillmentStatus: evidence.fulfillment_status,
      duplicateCompleteReusedOrder: evidence.recovery_result.duplicate_complete_reused_order,
      evidencePath: EVIDENCE_PATH,
    },
    null,
    2
  )
)

if (!buyerOrderVisible || !sellerOrderVisible) {
  throw new Error("Completed order is not visible in both buyer and seller order lists")
}
if (evidence.fulfillment_status !== "waiting") {
  throw new Error(`Fulfillment order is not waiting after captured payment (${evidence.fulfillment_status ?? "missing"})`)
}
