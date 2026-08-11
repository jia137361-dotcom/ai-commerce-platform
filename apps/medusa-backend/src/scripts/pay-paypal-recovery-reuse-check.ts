import fs from "node:fs"
import path from "node:path"
import { Modules } from "@medusajs/framework/utils"
import { POST as paymentRecovery } from "../api/store/carts/[id]/payment-recovery/route"

const CART_ID = "cart_01KYXPTEFAR3BAKN5YF650B0FV"
const EXPECTED_PAYPAL_ORDER_ID = "69907622C8410804N"

type MockRes = {
  statusCode?: number
  body?: unknown
  status: (code: number) => MockRes
  json: (body: unknown) => MockRes
}

const createRes = (): MockRes => {
  const res: Partial<MockRes> = {}
  res.status = (code: number) => {
    res.statusCode = code
    return res as MockRes
  }
  res.json = (body: unknown) => {
    res.body = body
    return res as MockRes
  }
  return res as MockRes
}

export default async function payPayPalRecoveryReuseCheck({ container }: { container: unknown }) {
  const storefrontEnv = fs.readFileSync(path.resolve(process.cwd(), "../storefront/.env.local"), "utf8")
  const publishableKey = storefrontEnv.match(/^VITE_PUBLISHABLE_API_KEY=(.+)$/m)?.[1]?.trim()
  if (!publishableKey) throw new Error("VITE_PUBLISHABLE_API_KEY is missing from storefront/.env.local")

  const cartModule = (container as { resolve: (key: string) => unknown }).resolve(Modules.CART) as {
    retrieveCart: (cartId: string) => Promise<{ customer_id?: string | null; metadata?: Record<string, unknown> | null }>
  }
  const cart = await cartModule.retrieveCart(CART_ID)
  if (!cart.customer_id) throw new Error("Cart is not customer-bound; cannot verify authenticated recovery reuse")

  const req = {
    params: { id: CART_ID },
    body: { provider_id: "pp_paypal_paypal" },
    headers: {
      "x-publishable-api-key": publishableKey,
      "x-store-id": "mkt01_paypal_runtime_20260801_store",
    },
    auth_context: { actor_id: cart.customer_id },
    scope: container,
  } as never
  const res = createRes()
  await paymentRecovery(req, res as never)

  if (res.statusCode !== 200) {
    throw new Error(`Payment recovery returned HTTP ${res.statusCode ?? "unknown"}`)
  }
  const body = res.body as Record<string, unknown> | undefined
  const paymentSession = (body?.payment_session as Record<string, unknown> | null | undefined) ?? {}
  const data = (paymentSession.data as Record<string, unknown> | null | undefined) ?? {}
  const returnedOrderId = typeof data.paypal_order_id === "string" ? data.paypal_order_id : null
  const returnedAttempt = body?.payment_attempt as Record<string, unknown> | undefined
  const returnedProviderPaymentId = typeof returnedAttempt?.provider_payment_id === "string" ? returnedAttempt.provider_payment_id : null
  if (returnedOrderId !== EXPECTED_PAYPAL_ORDER_ID) {
    throw new Error(`Expected recovery to reuse ${EXPECTED_PAYPAL_ORDER_ID}, got ${returnedOrderId ?? "missing"}`)
  }
  if (returnedProviderPaymentId !== EXPECTED_PAYPAL_ORDER_ID) {
    throw new Error(`Expected provider_payment_id to remain ${EXPECTED_PAYPAL_ORDER_ID}, got ${returnedProviderPaymentId ?? "missing"}`)
  }

  console.log(JSON.stringify({
    paymentRecoveryStatus: res.statusCode,
    reusedPayPalOrderId: returnedOrderId,
    reusedProviderPaymentId: returnedProviderPaymentId,
    cartId: CART_ID,
    closureClaimed: false,
  }, null, 2))
}
