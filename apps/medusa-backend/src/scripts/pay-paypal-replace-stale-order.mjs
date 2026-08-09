import fs from "node:fs"
import { Client } from "pg"

const CART_ID = process.env.PAY_PAYPAL_TEST_CART_ID || "cart_01KYXPTEFAR3BAKN5YF650B0FV"
const PAYMENT_COLLECTION_ID = process.env.PAY_PAYPAL_TEST_PAYMENT_COLLECTION_ID || "pay_col_01KYXPTFVY5S9JSKGECS3P3DJN"
const PAYMENT_SESSION_ID = process.env.PAY_PAYPAL_TEST_PAYMENT_SESSION_ID || "payses_01KYXPTFX1HBG19PF92DBZNX74"
const PREVIOUS_PAYPAL_ORDER_ID = process.env.PAY_PAYPAL_REPLACE_PREVIOUS_ORDER_ID || "3CN848320C473360L"
const ATTEMPT = process.env.PAY_PAYPAL_REPLACE_ATTEMPT || "2"
const EVIDENCE_PATH = new URL("../../../../docs/evidence/paypal-payment-closure.json", import.meta.url)

const backendEnv = fs.readFileSync(new URL("../../.env", import.meta.url), "utf8")
const readEnv = (key) => process.env[key] || backendEnv.match(new RegExp(`^${key}=(.+)$`, "m"))?.[1]
const databaseUrl = readEnv("DATABASE_URL")
const paypalClientId = readEnv("PAYPAL_CLIENT_ID")
const paypalClientSecret = readEnv("PAYPAL_CLIENT_SECRET")
const paypalEnvironment = readEnv("PAYPAL_ENVIRONMENT")
const brandName = readEnv("PAYPAL_BRAND_NAME") || "CiiVerse"
const storefrontUrl = readEnv("STOREFRONT_URL") || "http://127.0.0.1:5174"
const returnUrl = readEnv("PAYPAL_RETURN_URL") || `${storefrontUrl}/checkout?paypal_return=1`
const cancelUrl = readEnv("PAYPAL_CANCEL_URL") || `${storefrontUrl}/checkout?paypal_cancel=1`

if (!databaseUrl) throw new Error("DATABASE_URL is required")
if (!paypalClientId || !paypalClientSecret) throw new Error("PayPal Sandbox credentials are required")
if (paypalEnvironment !== "sandbox") throw new Error("PAYPAL_ENVIRONMENT=sandbox is required")

const decimalAmount = (minor, currencyCode) => {
  const zeroDecimal = new Set(["bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf"])
  const digits = zeroDecimal.has(currencyCode.toLowerCase()) ? 0 : 2
  return (Number(minor) / 10 ** digits).toFixed(digits)
}

let accessToken = null
const paypalToken = async () => {
  if (accessToken) return accessToken
  const response = await fetch("https://api-m.sandbox.paypal.com/v1/oauth2/token", {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${paypalClientId}:${paypalClientSecret}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body: "grant_type=client_credentials",
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload.access_token) throw new Error("PayPal sandbox authentication failed")
  accessToken = payload.access_token
  return accessToken
}

const paypalRequest = async (path, init = {}) => {
  const token = await paypalToken()
  const response = await fetch(`https://api-m.sandbox.paypal.com${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/json",
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(init.headers || {}),
    },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = payload.name || payload.details?.[0]?.issue || `PayPal request failed (${response.status})`
    const error = new Error(message)
    error.status = response.status
    error.paypalName = payload.name
    throw error
  }
  return payload
}

const selectApprovalLink = (order) => {
  const link = order.links?.find((candidate) => candidate.rel === "approve") ??
    order.links?.find((candidate) => candidate.rel === "payer-action") ??
    null
  return typeof link?.href === "string" ? { href: link.href, rel: link.rel } : { href: null, rel: null }
}

const previousDiagnostics = {
  id: PREVIOUS_PAYPAL_ORDER_ID,
  retrieved: false,
  status: null,
  capture_count: 0,
  error: null,
}
try {
  const previous = await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(PREVIOUS_PAYPAL_ORDER_ID)}`)
  previousDiagnostics.retrieved = true
  previousDiagnostics.status = previous.status ?? null
  previousDiagnostics.capture_count = previous.purchase_units?.[0]?.payments?.captures?.length ?? 0
} catch (error) {
  if (error.status !== 404) throw error
  previousDiagnostics.error = "RESOURCE_NOT_FOUND"
}

if (previousDiagnostics.capture_count > 0 || ["COMPLETED", "APPROVED"].includes(String(previousDiagnostics.status ?? "").toUpperCase())) {
  throw new Error("Refusing to replace a PayPal order that is approved, completed, or captured")
}

const client = new Client({ connectionString: databaseUrl })
await client.connect()
try {
  await client.query("begin")
  const sessionResult = await client.query(`
    select ps.id, ps.provider_id, ps.amount, ps.currency_code, ps.data, pc.id as payment_collection_id, cpc.cart_id
    from payment_session ps
    join payment_collection pc on pc.id = ps.payment_collection_id
    join cart_payment_collection cpc on cpc.payment_collection_id = pc.id and cpc.deleted_at is null
    where ps.id = $1
    for update
  `, [PAYMENT_SESSION_ID])
  const session = sessionResult.rows[0]
  if (!session) throw new Error("Medusa payment session was not found")
  if (session.provider_id !== "pp_paypal_paypal") throw new Error("Payment session is not PayPal")
  if (session.payment_collection_id !== PAYMENT_COLLECTION_ID) throw new Error("Payment collection mismatch")
  if (session.cart_id !== CART_ID) throw new Error("Cart mismatch")
  if (Number(session.amount) !== 4400 || session.currency_code !== "usd") throw new Error("Medusa authoritative amount/currency mismatch")

  const orderCount = await client.query("select count(*)::int as count from order_cart where cart_id = $1 and deleted_at is null", [CART_ID])
  if (orderCount.rows[0].count !== 0) throw new Error("Refusing replacement because a Medusa order already exists for this cart")
  const paymentCount = await client.query("select count(*)::int as count from payment where payment_collection_id = $1 and deleted_at is null", [PAYMENT_COLLECTION_ID])
  if (paymentCount.rows[0].count !== 0) throw new Error("Refusing replacement because a Medusa payment already exists")

  const currency = session.currency_code.toUpperCase()
  const requestId = `paypal-order:${PAYMENT_SESSION_ID}:attempt:${ATTEMPT}`
  const order = await paypalRequest("/v2/checkout/orders", {
    method: "POST",
    headers: { "PayPal-Request-Id": requestId },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{
        reference_id: PAYMENT_SESSION_ID,
        custom_id: PAYMENT_SESSION_ID,
        amount: { currency_code: currency, value: decimalAmount(session.amount, currency) },
      }],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: brandName,
            return_url: returnUrl,
            cancel_url: cancelUrl,
            user_action: "PAY_NOW",
            shipping_preference: "NO_SHIPPING",
          },
        },
      },
    }),
  })
  if (!order.id) throw new Error("PayPal did not return a new order id")
  const approvalLink = selectApprovalLink(order)
  if (!approvalLink.href) throw new Error("PayPal did not return an approve or payer-action link")

  const nextData = {
    ...(session.data || {}),
    id: order.id,
    paypal_order_id: order.id,
    paypal_status: order.status ?? null,
    paypal_capture_id: null,
    paypal_capture_status: null,
    paypal_replaced_order_id: PREVIOUS_PAYPAL_ORDER_ID,
    paypal_replacement_reason: previousDiagnostics.error || "broken_approval_url",
    paypal_order_linked_by: "controlled-replacement",
    medusa_payment_session_id: PAYMENT_SESSION_ID,
    cart_id: CART_ID,
    store_id: session.data?.store_id || "mkt01_paypal_runtime_20260801_store",
    amount: Number(session.amount),
    currency_code: session.currency_code,
  }
  await client.query("update payment_session set data = $1, updated_at = now() where id = $2", [nextData, PAYMENT_SESSION_ID])
  await client.query("update checkout_payment_attempt set provider_payment_id = $1, updated_at = now() where payment_session_id = $2 and deleted_at is null", [order.id, PAYMENT_SESSION_ID])
  await client.query("commit")

  const evidence = {
    provider: "paypal",
    mode: "sandbox",
    cart_id: CART_ID,
    payment_collection_id: PAYMENT_COLLECTION_ID,
    payment_session_id: PAYMENT_SESSION_ID,
    previous_paypal_order_id: PREVIOUS_PAYPAL_ORDER_ID,
    previous_paypal_order_status: previousDiagnostics.status,
    previous_paypal_order_capture_count: previousDiagnostics.capture_count,
    previous_paypal_order_error: previousDiagnostics.error,
    paypal_order_id: order.id,
    paypal_capture_id: null,
    paypal_order_status: order.status ?? null,
    paypal_intent: order.intent ?? "CAPTURE",
    paypal_amount: decimalAmount(session.amount, currency),
    paypal_currency: currency,
    approval_link_rel: approvalLink.rel,
    approval_link_source: "paypal_hateoas",
    approval_url_present: true,
    return_url_configured: true,
    cancel_url_configured: true,
    user_action: "PAY_NOW",
    medusa_order_id: null,
    buyer_order_visible: false,
    seller_order_visible: false,
    captured_sync_verified: false,
    fulfillment_row_count: 0,
    fulfillment_status: null,
    duplicate_order_recovery: null,
    duplicate_capture_result: null,
    controlled_replacement: {
      performed: true,
      request_id: requestId,
      old_order_had_capture: false,
      medusa_order_existed_before_replacement: false,
      medusa_payment_existed_before_replacement: false,
    },
    closure_claimed: false,
    blocker: "PayPal sandbox buyer approval is required before capture and cart completion.",
    timestamp: new Date().toISOString(),
  }
  fs.mkdirSync(new URL("../../../../docs/evidence/", import.meta.url), { recursive: true })
  fs.writeFileSync(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`)
  console.log(JSON.stringify({
    paypalOrderId: order.id,
    paypalOrderStatus: order.status ?? null,
    createTime: order.create_time ?? null,
    approvalLinkRel: approvalLink.rel,
    approvalLinkSource: "paypal_hateoas",
    approvalUrl: approvalLink.href,
    returnUrlConfigured: true,
    cancelUrlConfigured: true,
    userAction: "PAY_NOW",
    previousPayPalOrderCaptureCount: previousDiagnostics.capture_count,
    newPayPalOrderCaptureCount: order.purchase_units?.[0]?.payments?.captures?.length ?? 0,
    closureClaimed: false,
  }, null, 2))
} catch (error) {
  await client.query("rollback").catch(() => undefined)
  throw error
} finally {
  await client.end()
}
