import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { completeCartWorkflow } from "@medusajs/medusa/core-flows"
import { CHECKOUT_PAYMENT_ATTEMPT_STATUSES } from "../modules/checkout-payment-attempts/models/checkout-payment-attempt"
import { CHECKOUT_PAYMENT_ATTEMPTS_MODULE } from "../modules/checkout-payment-attempts"
import type CheckoutPaymentAttemptsModuleService from "../modules/checkout-payment-attempts/service"
import { findCartPaymentSession, readCartPaymentCollectionId } from "./ensure-cart-payment-ready"
import type { PaymentSessionRow } from "./ensure-cart-payment-ready"
import { stripeApiRequest } from "./stripe-client"
import { extractPaymentIntentIdFromClientSecret, formatStripePaymentMethodLabel } from "./stripe-payment-method-label"

export const CHECKOUT_PAYMENT_ATTEMPT_WINDOW_MS = 15 * 60 * 1000

export type CheckoutPaymentAttemptStatus = (typeof CHECKOUT_PAYMENT_ATTEMPT_STATUSES)[number]

export type CheckoutPaymentAttemptRecord = {
  id: string
  cart_id?: string | null
  store_id?: string | null
  customer_id?: string | null
  provider_id?: string | null
  payment_collection_id?: string | null
  payment_session_id?: string | null
  provider_payment_id?: string | null
  completed_order_id?: string | null
  status?: CheckoutPaymentAttemptStatus | string | null
  expires_at?: string | Date | null
  created_at?: string | Date | null
  last_error?: string | null
  metadata?: Record<string, unknown> | null
}

export type StripePaymentIntent = {
  id: string
  status?: string | null
  client_secret?: string | null
  payment_method?: string | { type?: string; card?: { brand?: string; last4?: string; wallet?: { type?: string | null } | null } | null } | null
}

export const ACTIVE_ATTEMPT_STATUSES = new Set<CheckoutPaymentAttemptStatus>([
  "created",
  "awaiting_payment",
  "requires_action",
  "payment_failed",
  "payment_processing",
  "payment_succeeded",
  "order_completion_failed",
])

export const TERMINAL_ATTEMPT_STATUSES = new Set<CheckoutPaymentAttemptStatus>([
  "completed",
  "expired",
  "cancelled",
])

export const isActiveCheckoutPaymentAttemptStatus = (status?: string | null) =>
  Boolean(status && ACTIVE_ATTEMPT_STATUSES.has(status as CheckoutPaymentAttemptStatus))

export const isTerminalCheckoutPaymentAttemptStatus = (status?: string | null) =>
  Boolean(status && TERMINAL_ATTEMPT_STATUSES.has(status as CheckoutPaymentAttemptStatus))

export const isCheckoutPaymentAttemptExpired = (attempt: CheckoutPaymentAttemptRecord, now = Date.now()) => {
  const expiresAt = typeof attempt.expires_at === "string" ? Date.parse(attempt.expires_at) : attempt.expires_at instanceof Date ? attempt.expires_at.getTime() : NaN
  if (!Number.isFinite(expiresAt)) return false
  return expiresAt <= now
}

export const isStripeProviderId = (providerId?: string | null) => Boolean(providerId?.startsWith("pp_stripe_"))
export const isPayPalProviderId = (providerId?: string | null) => Boolean(providerId?.startsWith("pp_paypal_"))

export const readPayPalOrderId = (session?: { data?: Record<string, unknown> | null } | null) => {
  const value = session?.data?.paypal_order_id
  return typeof value === "string" && value.trim() ? value : null
}

export const normalizePayPalOrderStatus = (
  status?: string | null,
  captureStatus?: string | null
): CheckoutPaymentAttemptStatus => {
  switch (String(captureStatus ?? "").toUpperCase()) {
    case "COMPLETED":
      return "payment_succeeded"
    case "PENDING":
      return "payment_processing"
    case "DENIED":
    case "DECLINED":
    case "FAILED":
    case "REVERSED":
      return "payment_failed"
  }
  switch (String(status ?? "").toUpperCase()) {
    case "COMPLETED":
      return "payment_processing"
    case "APPROVED":
      return "requires_action"
    case "VOIDED":
    case "CANCELED":
    case "CANCELLED":
      return "cancelled"
    case "PAYER_ACTION_REQUIRED":
    case "DENIED":
      return "payment_failed"
    default:
      return "payment_processing"
  }
}

export const readPayPalCaptureStatus = (order?: {
  purchase_units?: Array<{ payments?: { captures?: Array<{ status?: string | null }> } }>
} | null) => order?.purchase_units?.[0]?.payments?.captures?.[0]?.status ?? null

export const readPaymentAttemptClientSecret = (session?: { data?: Record<string, unknown> | null; client_secret?: string | null; clientSecret?: string | null } | null) => {
  const data = session?.data ?? undefined
  const fromData =
    typeof data?.client_secret === "string"
      ? data.client_secret
      : typeof data?.clientSecret === "string"
        ? data.clientSecret
        : null
  const direct =
    typeof session?.client_secret === "string"
      ? session.client_secret
      : typeof session?.clientSecret === "string"
        ? session.clientSecret
        : null
  const secret = direct ?? fromData
  return typeof secret === "string" && secret.includes("_secret_") ? secret : null
}

export const readPaymentAttemptPaymentIntentId = (session?: { data?: Record<string, unknown> | null; client_secret?: string | null; clientSecret?: string | null } | null) => {
  const data = session?.data ?? undefined
  const direct = data?.id
  if (typeof direct === "string" && direct.startsWith("pi_")) return direct
  const nested = data?.payment_intent
  if (typeof nested === "string" && nested.startsWith("pi_")) return nested
  if (nested && typeof nested === "object" && typeof (nested as { id?: string }).id === "string") {
    const id = (nested as { id: string }).id
    if (id.startsWith("pi_")) return id
  }
  const secret = readPaymentAttemptClientSecret(session)
  return secret ? extractPaymentIntentIdFromClientSecret(secret) : null
}

export const normalizeStripePaymentIntentStatus = (status?: string | null): CheckoutPaymentAttemptStatus => {
  switch (status) {
    case "succeeded":
    case "requires_capture":
      return "payment_succeeded"
    case "requires_action":
      return "requires_action"
    case "requires_payment_method":
      return "payment_failed"
    case "processing":
      return "payment_processing"
    case "canceled":
      return "cancelled"
    default:
      return "awaiting_payment"
  }
}

export const formatPaymentAttemptError = (error: unknown) => {
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error
  if (error && typeof error === "object") {
    const candidate = error as { message?: unknown; code?: unknown; paypalIssue?: unknown; stripeCode?: unknown }
    if (typeof candidate.message === "string" && candidate.message) return candidate.message
    if (typeof candidate.paypalIssue === "string") return candidate.paypalIssue
    if (typeof candidate.stripeCode === "string") return candidate.stripeCode
    if (typeof candidate.code === "string") return candidate.code
  }
  return "Payment provider did not return an error message"
}

export async function readActiveCheckoutPaymentAttempt(
  container: MedusaContainer,
  input: { cartId: string; storeId: string }
): Promise<CheckoutPaymentAttemptRecord | null> {
  const service = container.resolve(CHECKOUT_PAYMENT_ATTEMPTS_MODULE) as CheckoutPaymentAttemptsModuleService
  const attempts = (await service.listCheckoutPaymentAttempts(
    {
      cart_id: [input.cartId],
      store_id: [input.storeId],
    },
    { order: { created_at: "DESC" }, take: 5 }
  )) as CheckoutPaymentAttemptRecord[]
  return attempts.find((attempt) => isActiveCheckoutPaymentAttemptStatus(attempt.status ?? null)) ?? null
}

export async function readCheckoutPaymentAttemptById(
  container: MedusaContainer,
  attemptId: string
): Promise<CheckoutPaymentAttemptRecord | null> {
  const service = container.resolve(CHECKOUT_PAYMENT_ATTEMPTS_MODULE) as CheckoutPaymentAttemptsModuleService
  const attempts = (await service.listCheckoutPaymentAttempts({ id: [attemptId] }, { take: 1 })) as CheckoutPaymentAttemptRecord[]
  return attempts[0] ?? null
}

export async function readAttemptPaymentSession(
  container: MedusaContainer,
  attempt: CheckoutPaymentAttemptRecord
): Promise<PaymentSessionRow | null> {
  const paymentCollectionId = attempt.payment_collection_id ?? (attempt.cart_id ? await readCartPaymentCollectionId(container, attempt.cart_id) : null)
  if (!paymentCollectionId) return null

  const session = await findCartPaymentSession(
    container,
    attempt.cart_id ?? "",
    attempt.provider_id ?? ""
  )
  if (session) return session

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = (await query.graph({
    entity: "payment_session",
    fields: ["id", "provider_id", "status", "amount", "currency_code", "data"],
    filters: { payment_collection_id: paymentCollectionId },
  })) as { data: PaymentSessionRow[] }
  return data.find((row) => row.id && row.provider_id === attempt.provider_id) ?? null
}

export async function readStripePaymentIntentForAttempt(
  container: MedusaContainer,
  attempt: CheckoutPaymentAttemptRecord,
  session?: { data?: Record<string, unknown> | null } | null
): Promise<StripePaymentIntent | null> {
  const paymentIntentId = attempt.provider_payment_id ?? readPaymentAttemptPaymentIntentId(session)
  if (!paymentIntentId) return null
  return stripeApiRequest<StripePaymentIntent>(`/payment_intents/${paymentIntentId}`)
}

export async function tryCompleteCheckoutOrder(
  container: MedusaContainer,
  input: { cartId: string; storeId: string }
): Promise<{ orderId: string | null; order: { id?: string; customer_id?: string | null; metadata?: Record<string, unknown> | null } | null }> {
  const cartModule = container.resolve(Modules.CART)
  const orderModule = container.resolve(Modules.ORDER)
  const cart = await cartModule.retrieveCart(input.cartId, {
    relations: ["items", "shipping_address", "shipping_methods"],
  })
  const alreadyCompleted = await orderModule.listOrders?.(
    cart.customer_id ? { customer_id: cart.customer_id } : cart.email ? { email: cart.email } : {},
    { select: ["id", "customer_id", "metadata"], order: { created_at: "DESC" }, take: 100 }
  )
  if (alreadyCompleted?.length) {
    const found = alreadyCompleted.find((order: { id?: string; metadata?: Record<string, unknown> | null }) =>
      order.metadata?.checkout_cart_id === input.cartId && order.metadata?.store_id === input.storeId
    )
    if (found?.id) {
      return { orderId: found.id, order: found as never }
    }
  }
  const workflowResult = await completeCartWorkflow(container).run({ input: { id: input.cartId } })
  const orderId = (workflowResult.result as { id?: string } | undefined)?.id ?? null
  if (!orderId) return { orderId: null, order: null }
  const order = await orderModule.retrieveOrder(orderId)
  return { orderId, order }
}
