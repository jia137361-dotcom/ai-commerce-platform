#!/usr/bin/env node
/**
 * Verify dev account logins and buyer sign-up flow against local Medusa.
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const BACKEND = process.env.MEDUSA_BACKEND_URL || "http://127.0.0.1:9000"
const PASSWORD = process.env.DEV_ACCOUNTS_PASSWORD || "Meng1355026750"
const PLATFORM_OPS_EMAIL = "1355026750@qq.com"
const SELLER_EMAIL = "lujiamengvivi79@gmail.com"
const BUYER_EMAIL = "1355026750@qq.com"

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..")
const storefrontEnv = fs.readFileSync(path.join(repoRoot, "apps/storefront/.env.local"), "utf8")
const publishableKey = storefrontEnv.match(/^VITE_PUBLISHABLE_API_KEY=(.+)$/m)?.[1]?.trim()
if (!publishableKey) throw new Error("VITE_PUBLISHABLE_API_KEY missing in storefront/.env.local")

const jsonRequest = async (routePath, { method = "GET", body, token, admin = false, publishable = false, storeId } = {}) => {
  const headers = { "content-type": "application/json" }
  if (publishable) headers["x-publishable-api-key"] = publishableKey
  if (token) headers.authorization = `Bearer ${token}`
  if (storeId) headers["x-store-id"] = storeId
  const response = await fetch(`${BACKEND}${routePath}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const payload = await response.json().catch(() => ({}))
  return { ok: response.ok, status: response.status, payload }
}

const assertOk = (label, result) => {
  if (!result.ok) {
    throw new Error(`${label} failed (${result.status}): ${JSON.stringify(result.payload)}`)
  }
  console.log(`OK ${label}`)
}

const health = await jsonRequest("/health")
assertOk("health", health)

const opsAuth = await jsonRequest("/auth/user/emailpass", {
  method: "POST",
  admin: true,
  body: { email: PLATFORM_OPS_EMAIL, password: PASSWORD },
})
assertOk("platform ops login", opsAuth)
const opsToken = opsAuth.payload?.token
if (!opsToken) throw new Error("platform ops login missing token")

const opsOverview = await jsonRequest("/admin/platform/overview", { token: opsToken })
assertOk("platform ops overview API", opsOverview)

const sellerAuth = await jsonRequest("/auth/user/emailpass", {
  method: "POST",
  admin: true,
  body: { email: SELLER_EMAIL, password: PASSWORD },
})
assertOk("seller login", sellerAuth)
const sellerToken = sellerAuth.payload?.token
if (!sellerToken) throw new Error("seller login missing token")

const sellerProducts = await jsonRequest("/admin/store-products?limit=1", { token: sellerToken })
assertOk("seller products API", sellerProducts)

const buyerAuth = await jsonRequest("/auth/customer/emailpass", {
  method: "POST",
  body: { email: BUYER_EMAIL, password: PASSWORD },
})
assertOk("buyer login", buyerAuth)
const buyerToken = buyerAuth.payload?.token
if (!buyerToken) throw new Error("buyer login missing token")

const buyerMe = await jsonRequest("/store/customers/me", { token: buyerToken, publishable: true })
assertOk("buyer profile API", buyerMe)

const signupEmail = `signup.test.${Date.now()}@example.com`
const signupRegister = await jsonRequest("/auth/customer/emailpass/register", {
  method: "POST",
  body: { email: signupEmail, password: PASSWORD },
})
assertOk("buyer sign-up register", signupRegister)
const signupToken = signupRegister.payload?.token
if (!signupToken) throw new Error("buyer sign-up missing token")

const signupCreate = await jsonRequest("/store/customers", {
  method: "POST",
  token: signupToken,
  publishable: true,
  body: { email: signupEmail, first_name: "Signup", last_name: "Test" },
})
assertOk("buyer sign-up create customer", signupCreate)

const sellerRegister = await jsonRequest("/seller/register", {
  method: "POST",
  body: {
    email: `seller.signup.${Date.now()}@example.com`,
    password: PASSWORD,
    store_name: "Verify Signup Store",
    first_name: "Signup",
    last_name: "Seller",
  },
})
assertOk("seller sign-up register", sellerRegister)
const sellerSignupToken = sellerRegister.payload?.seller?.token
const sellerSignupStoreId = sellerRegister.payload?.seller?.store_id
if (!sellerSignupToken || !sellerSignupStoreId) {
  throw new Error("seller sign-up missing token or store_id")
}

const sellerSignupSession = await jsonRequest("/seller/session", { token: sellerSignupToken })
assertOk("seller sign-up session", sellerSignupSession)

const sellerSignupProducts = await jsonRequest("/admin/store-products?limit=1", {
  token: sellerSignupToken,
  storeId: sellerSignupStoreId,
})
assertOk("seller sign-up products API", sellerSignupProducts)

console.log("DEV_ACCOUNTS_VERIFY_OK=true")
