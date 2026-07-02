import fs from "node:fs"

const BACKEND = process.env.MEDUSA_BACKEND_URL || "http://127.0.0.1:9000"
const STORE_ID = "mkt01_stripe_test_store_20260621_01"
const PRODUCT_ID = "mkt01_stripe_test_product_20260621_01"
const REGION_ID = "reg_01KRMT56X5MCH0A9DTSNZ81GFW"
const PROVIDER_ID = "pp_stripe_stripe"
const BUYER_EMAIL = "mkt01_stripe_buyer_a_20260621_01@example.com"
const SELLER_EMAIL = "mkt01_stripe_seller_20260621_01@example.com"
const PASSWORD = process.env.PAY_STRIPE_TEST_PASSWORD
const STRIPE_SECRET = process.env.STRIPE_API_KEY

if (!PASSWORD) throw new Error("PAY_STRIPE_TEST_PASSWORD is required")
if (!STRIPE_SECRET?.startsWith("sk_test_")) throw new Error("A Stripe test secret key is required")

const storefrontEnv = fs.readFileSync(new URL("../../../storefront/.env.local", import.meta.url), "utf8")
const publishableKey = storefrontEnv.match(/^VITE_PUBLISHABLE_API_KEY=(.+)$/m)?.[1]?.trim()
if (!publishableKey) throw new Error("VITE_PUBLISHABLE_API_KEY is missing from storefront/.env.local")

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
      country_code: "cn",
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
  `/store/payment-providers?region_id=${encodeURIComponent(REGION_ID)}`,
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

console.log(
  JSON.stringify(
    {
      buyerEmail: BUYER_EMAIL,
      cartId,
      nativeVariantId: variantId,
      shippingOptionId: shippingOption.id,
      shippingAmount: shippingOption.amount,
      shippingCurrency: shippingOption.currency_code,
      paymentProviderId: PROVIDER_ID,
      clientSecretPresent: true,
      paymentIntentId,
      paymentIntentStatus: stripePayload.status,
      orderId,
      buyerOrderVisible: Boolean(buyerOrderVisible),
      sellerOrderVisible: Boolean(sellerOrderVisible),
    },
    null,
    2
  )
)

if (!buyerOrderVisible || !sellerOrderVisible) {
  throw new Error("Completed order is not visible in both buyer and seller order lists")
}
