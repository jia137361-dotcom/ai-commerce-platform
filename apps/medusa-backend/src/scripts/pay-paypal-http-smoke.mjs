import fs from "node:fs"

const BACKEND = process.env.MEDUSA_BACKEND_URL || "http://127.0.0.1:9000"
const STORE_ID = process.env.PAY_PAYPAL_TEST_STORE_ID || "mkt01_paypal_runtime_20260801_store"
const PRODUCT_ID = process.env.PAY_PAYPAL_TEST_PRODUCT_ID || "mkt01_paypal_runtime_20260801_product"
const PASSWORD = process.env.PAY_PAYPAL_TEST_PASSWORD
const SELLER_EMAIL = process.env.PAY_PAYPAL_TEST_SELLER_EMAIL || "mkt01_paypal_seller_runtime_20260801@example.com"
const BUYER_A_EMAIL = process.env.PAY_PAYPAL_TEST_BUYER_A_EMAIL || "mkt01_paypal_buyer_runtime_20260801_a@example.com"
const BUYER_B_EMAIL = process.env.PAY_PAYPAL_TEST_BUYER_B_EMAIL || "mkt01_paypal_buyer_runtime_20260801_b@example.com"
const PROVIDER_ID = "pp_paypal_paypal"

if (!PASSWORD) throw new Error("PAY_PAYPAL_TEST_PASSWORD is required")
console.log("PAY_PAYPAL_TEST_PASSWORD_PRESENT=true")
if (process.env.PAYPAL_ENVIRONMENT !== "sandbox") throw new Error("PAYPAL_ENVIRONMENT=sandbox is required")
if (!process.env.PAYPAL_CLIENT_ID) throw new Error("PAYPAL_CLIENT_ID is required")
if (!process.env.PAYPAL_CLIENT_SECRET) throw new Error("PAYPAL_CLIENT_SECRET is required")
if (!process.env.PAYPAL_WEBHOOK_ID) throw new Error("PAYPAL_WEBHOOK_ID is required")

const storefrontEnv = fs.readFileSync(new URL("../../../storefront/.env.local", import.meta.url), "utf8")
const publishableKey = storefrontEnv.match(/^VITE_PUBLISHABLE_API_KEY=(.+)$/m)?.[1]?.trim()
const paypalClientId = storefrontEnv.match(/^VITE_PAYPAL_CLIENT_ID=(.+)$/m)?.[1]?.trim()
if (!publishableKey) throw new Error("VITE_PUBLISHABLE_API_KEY is missing from storefront/.env.local")
if (!paypalClientId) throw new Error("VITE_PAYPAL_CLIENT_ID is missing from storefront/.env.local")

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

const createBuyerSession = async (email) => {
  let auth
  let registered = false
  let customerId
  try {
    auth = await jsonRequest("/auth/customer/emailpass/register", { method: "POST", body: { email, password: PASSWORD } })
    registered = true
  } catch {
    auth = await jsonRequest("/auth/customer/emailpass", { method: "POST", body: { email, password: PASSWORD } })
  }
  let token = auth.payload.token
  if (registered) {
    const created = await jsonRequest("/store/customers", {
      method: "POST",
      token,
      body: { email, first_name: "PayPal", last_name: email.includes("_a@") ? "Buyer A" : "Buyer B", phone: "+15555550123" },
    })
    customerId = created.payload.customer?.id
    const refreshedAuth = await jsonRequest("/auth/customer/emailpass", { method: "POST", body: { email, password: PASSWORD } })
    token = refreshedAuth.payload.token
  }
  const session = await jsonRequest("/auth/session", { method: "POST", token })
  const setCookies = session.response.headers.getSetCookie?.() ?? []
  const fallbackCookie = session.response.headers.get("set-cookie")
  const cookie = setCookies.map((value) => value.split(";", 1)[0]).join("; ") || fallbackCookie?.split(";", 1)[0]
  if (!customerId) {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"))
    customerId = payload.actor_id
  }
  if (!customerId) throw new Error(`Unable to resolve customer ID for ${email}`)
  return { email, customerId, cookie, token }
}

const createBuyerCart = async (buyer, variantId) => {
  const created = await jsonRequest("/store/carts", {
    method: "POST",
    cookie: buyer.cookie,
    token: buyer.token,
    body: { currency_code: "usd" },
  })
  const cartId = created.payload.cart_id || created.payload.id
  await jsonRequest(`/store/carts/${cartId}/line-items`, {
    method: "POST",
    cookie: buyer.cookie,
    token: buyer.token,
    body: { variant_id: variantId, quantity: 1 },
  })
  await jsonRequest(`/store/carts/${cartId}/customer`, {
    method: "POST",
    cookie: buyer.cookie,
    token: buyer.token,
    body: {},
  })
  const cart = (await jsonRequest(`/store/carts/${cartId}`, { cookie: buyer.cookie, token: buyer.token })).payload
  return { cartId, cart }
}

const sellerAuth = await jsonRequest("/auth/user/emailpass", {
  method: "POST",
  admin: true,
  body: { email: SELLER_EMAIL, password: PASSWORD },
})
const sellerProducts = await jsonRequest("/admin/store-products?status=published&limit=20", {
  token: sellerAuth.payload.token,
  admin: true,
})
const sellerProduct = sellerProducts.payload.products?.find((product) => product.product_id === PRODUCT_ID || product.id === PRODUCT_ID)
if (!sellerProduct) throw new Error("Seller published product not found")

const buyerProducts = await jsonRequest("/store/products")
const buyerProduct = buyerProducts.payload.products?.find((product) => product.product_id === PRODUCT_ID || product.id === PRODUCT_ID)
if (!buyerProduct) throw new Error("Buyer product grid did not return the isolated PayPal product")
const detail = (await jsonRequest(`/store/products/${PRODUCT_ID}`)).payload.product
const variantId = detail.medusa_variant_id || detail.variants?.[0]?.id
if (!variantId) throw new Error("Buyer product detail did not return a native variant ID")

const buyerA = await createBuyerSession(BUYER_A_EMAIL)
const buyerB = await createBuyerSession(BUYER_B_EMAIL)
const cartA = await createBuyerCart(buyerA, variantId)
const cartB = await createBuyerCart(buyerB, variantId)
const cartTotal = (cart) => cart.total ?? cart.items?.reduce((sum, item) => sum + (item.total ?? item.unit_price * item.quantity), 0)
if (cartA.cartId === cartB.cartId) throw new Error("Buyer carts unexpectedly share the same cart ID")
if (cartA.cart.customer_id !== buyerA.customerId || cartB.cart.customer_id !== buyerB.customerId) throw new Error("Cart customer binding mismatch")
if (!(cartTotal(cartA.cart) > 0) || !(cartTotal(cartB.cart) > 0)) throw new Error("Cart total is not positive")

await jsonRequest(`/store/carts/${cartA.cartId}/contact`, {
  method: "PUT",
  cookie: buyerA.cookie,
  token: buyerA.token,
  body: { email: BUYER_A_EMAIL, phone: "+15555550123" },
})
const region = await jsonRequest(`/store/regions/${encodeURIComponent(cartA.cart.region_id)}`, {
  cookie: buyerA.cookie,
  token: buyerA.token,
})
const countryCode = region.payload.region?.countries?.[0]?.iso_2 || region.payload.region?.countries?.[0]?.iso2 || "us"
await jsonRequest(`/store/carts/${cartA.cartId}/address`, {
  method: "PUT",
  cookie: buyerA.cookie,
  token: buyerA.token,
  body: {
    email: BUYER_A_EMAIL,
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
const shipping = await jsonRequest(`/store/carts/${cartA.cartId}/shipping-options`, {
  cookie: buyerA.cookie,
  token: buyerA.token,
})
const pricedShipping = shipping.payload.shipping_options?.find((option) => typeof option.amount === "number" && option.amount > 0)
if (!pricedShipping?.id) throw new Error("No priced shipping option is available for Buyer A")
await jsonRequest(`/store/carts/${cartA.cartId}/shipping-methods`, {
  method: "POST",
  cookie: buyerA.cookie,
  token: buyerA.token,
  body: { option_id: pricedShipping.id },
})

const regionId = cartA.cart.region_id
const providers = regionId
  ? await jsonRequest(`/store/payment-providers?region_id=${encodeURIComponent(regionId)}`, { cookie: buyerA.cookie, token: buyerA.token })
  : { payload: { payment_providers: [] } }
const paypalProvider = providers.payload.payment_providers?.find((provider) => provider.id === PROVIDER_ID)
if (!paypalProvider) throw new Error("PayPal provider pp_paypal_paypal is unavailable")

console.log(JSON.stringify({
  seller: { email: SELLER_EMAIL, productVisible: true },
  storeId: STORE_ID,
  product: { id: PRODUCT_ID, nativeVariantId: variantId, price: detail.price, requiresShipping: detail.requires_shipping },
  buyerA: {
    email: BUYER_A_EMAIL,
    customerId: buyerA.customerId,
    cartId: cartA.cartId,
    total: cartTotal(cartA.cart),
    shippingOptionCount: shipping.payload.shipping_options?.length ?? 0,
    pricedShippingSelected: Boolean(pricedShipping),
  },
  buyerB: { email: BUYER_B_EMAIL, customerId: buyerB.customerId, cartId: cartB.cartId, total: cartTotal(cartB.cart) },
  cartIsolation: cartA.cartId !== cartB.cartId && cartA.cart.customer_id !== cartB.cart.customer_id,
  regionId,
  checkoutCountryCode: countryCode,
  paymentProviderIds: providers.payload.payment_providers?.map((provider) => provider.id) ?? [],
  paypalProviderAvailable: Boolean(paypalProvider),
}, null, 2))
