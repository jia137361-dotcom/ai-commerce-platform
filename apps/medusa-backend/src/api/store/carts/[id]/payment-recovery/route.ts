import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { deletePaymentSessionsWorkflow } from "@medusajs/core-flows"
import { assertCartBelongsToCurrentStore, readCartStoreId } from "../../../../../lib/assert-cart-store"
import { CartStoreAccessError } from "../../../../../lib/cart-store-error"
import {
  CHECKOUT_PAYMENT_ATTEMPT_WINDOW_MS,
  formatPaymentAttemptError,
  isCheckoutPaymentAttemptExpired,
  isPayPalProviderId,
  isStripeProviderId,
  normalizePayPalOrderStatus,
  normalizeStripePaymentIntentStatus,
  readActiveCheckoutPaymentAttempt,
  readAttemptPaymentSession,
  readPayPalOrderId,
  readPayPalCaptureStatus,
  readPaymentAttemptPaymentIntentId,
  readStripePaymentIntentForAttempt,
  type CheckoutPaymentAttemptRecord,
  type CheckoutPaymentAttemptStatus,
} from "../../../../../lib/checkout-payment-attempts"
import { ensureCartPaymentReady, findCartPaymentSession, readCartPaymentCollectionId } from "../../../../../lib/ensure-cart-payment-ready"
import { CHECKOUT_PAYMENT_ATTEMPTS_MODULE } from "../../../../../modules/checkout-payment-attempts"
import type CheckoutPaymentAttemptsModuleService from "../../../../../modules/checkout-payment-attempts/service"
import { getConfiguredPayPalClient, isPayPalResourceNotFoundError } from "../../../../../modules/paypal/client"
import { isStripeResourceNotFoundError } from "../../../../../lib/stripe-client"

type AuthenticatedRequest = MedusaRequest & {
  auth_context?: {
    actor_id?: string
  }
}

type CheckoutCart = {
  id: string
  customer_id?: string | null
  email?: string | null
  metadata?: Record<string, unknown> | null
  total?: unknown
  currency_code?: string | null
}

type AttemptService = CheckoutPaymentAttemptsModuleService & {
  createCheckoutPaymentAttempts: (input: Record<string, unknown>) => Promise<CheckoutPaymentAttemptRecord>
  updateCheckoutPaymentAttempts: (input: Record<string, unknown>) => Promise<CheckoutPaymentAttemptRecord[] | CheckoutPaymentAttemptRecord>
}

const DEFAULT_PAYMENT_PROVIDER = "pp_system_default"

const isMissingExternalPaymentResource = (error: unknown) =>
  isPayPalResourceNotFoundError(error) || isStripeResourceNotFoundError(error)

const readHeader = (req: MedusaRequest, name: string) => {
  const value = req.headers[name.toLowerCase()]
  return Array.isArray(value) ? value[0] : value
}

const readAuthCustomerId = (req: MedusaRequest) =>
  (req as AuthenticatedRequest).auth_context?.actor_id ?? null

const validateHeaders = (req: MedusaRequest) => {
  if (!readHeader(req, "x-publishable-api-key")) return "x-publishable-api-key is required"
  if (!readHeader(req, "x-store-id")) return "X-Store-Id is required"
  return null
}

const statusRecoveryAction = (status: CheckoutPaymentAttemptStatus | string): "confirm_payment" | "complete_order" | "wait" | "completed" => {
  if (status === "completed") return "completed"
  if (status === "payment_succeeded" || status === "order_completion_failed") return "complete_order"
  if (status === "payment_processing") return "wait"
  return "confirm_payment"
}

const dateValue = (value: unknown) => {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "string") return value
  return null
}

const serializeAttempt = (attempt: CheckoutPaymentAttemptRecord, status: CheckoutPaymentAttemptStatus | string) => ({
  id: attempt.id,
  cart_id: attempt.cart_id ?? null,
  store_id: attempt.store_id ?? null,
  customer_id: attempt.customer_id ?? null,
  provider_id: attempt.provider_id ?? null,
  payment_collection_id: attempt.payment_collection_id ?? null,
  payment_session_id: attempt.payment_session_id ?? null,
  provider_payment_id: attempt.provider_payment_id ?? null,
  completed_order_id: attempt.completed_order_id ?? null,
  status,
  expires_at: dateValue(attempt.expires_at),
  last_error: attempt.last_error ?? null,
  recovery_action: statusRecoveryAction(status),
})

const patchAttempt = async (
  service: AttemptService,
  attempt: CheckoutPaymentAttemptRecord,
  patch: Record<string, unknown>
) => {
  const updated = await service.updateCheckoutPaymentAttempts({
    id: attempt.id,
    ...patch,
  })
  return (Array.isArray(updated) ? updated[0] : updated) as CheckoutPaymentAttemptRecord
}

const createAttempt = async (
  container: MedusaContainer,
  service: AttemptService,
  input: {
    cartId: string
    storeId: string
    customerId: string | null
    providerId: string
  }
) => {
  try {
    return (await service.createCheckoutPaymentAttempts({
      cart_id: input.cartId,
      store_id: input.storeId,
      customer_id: input.customerId,
      provider_id: input.providerId,
      status: "created",
      expires_at: new Date(Date.now() + CHECKOUT_PAYMENT_ATTEMPT_WINDOW_MS),
      payment_collection_id: null,
      payment_session_id: null,
      provider_payment_id: null,
      completed_order_id: null,
      last_error: null,
      metadata: null,
    })) as CheckoutPaymentAttemptRecord
  } catch (error) {
    const active = await readActiveCheckoutPaymentAttempt(container, {
      cartId: input.cartId,
      storeId: input.storeId,
    })
    if (active) return active
    throw error
  }
}

const buildResponse = (input: {
  cartId: string
  attempt: CheckoutPaymentAttemptRecord
  status: CheckoutPaymentAttemptStatus | string
  session?: { id?: string; provider_id?: string; status?: string; data?: Record<string, unknown> | null } | null
  clientSecret?: string | null
  orderId?: string | null
  paymentIntentStatus?: string | null
}) => ({
  cart_id: input.cartId,
  status: input.status,
  payment_attempt: serializeAttempt(input.attempt, input.status),
  payment_session: input.session
    ? {
        id: input.session.id ?? null,
        provider_id: input.session.provider_id ?? null,
        status: input.session.status ?? null,
        data: input.session.data ?? null,
        client_secret: input.clientSecret ?? null,
      }
    : null,
  order_id: input.orderId ?? input.attempt.completed_order_id ?? null,
  payment_intent_status: input.paymentIntentStatus ?? null,
})

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const headerError = validateHeaders(req)
    if (headerError) {
      return res.status(401).json({
        error: { code: "CHECKOUT_HEADER_REQUIRED", message: headerError },
      })
    }

    const cartId = req.params.id as string
    const body = (req.body ?? {}) as { provider_id?: string; reserve_only?: boolean }
    const requestedProviderId = body.provider_id?.trim() || null
    const reserveOnly = body.reserve_only === true
    const cartModule = req.scope.resolve(Modules.CART)
    const cart = (await cartModule.retrieveCart(cartId, {
      relations: ["payment_collection"],
    })) as CheckoutCart
    assertCartBelongsToCurrentStore(req, cart)
    const storeId = readCartStoreId(cart)
    const authCustomerId = readAuthCustomerId(req)

    if (cart.customer_id && !authCustomerId) {
      return res.status(403).json({
        error: { code: "PAYMENT_ATTEMPT_CUSTOMER_REQUIRED", message: "Sign in to recover this payment attempt." },
      })
    }
    if (cart.customer_id && authCustomerId !== cart.customer_id) {
      return res.status(403).json({
        error: { code: "PAYMENT_ATTEMPT_CUSTOMER_MISMATCH", message: "This payment attempt belongs to a different customer." },
      })
    }

    const service = req.scope.resolve(CHECKOUT_PAYMENT_ATTEMPTS_MODULE) as AttemptService
    let attempt = await readActiveCheckoutPaymentAttempt(req.scope, { cartId, storeId })
    let providerId = requestedProviderId || attempt?.provider_id || DEFAULT_PAYMENT_PROVIDER

    if (attempt?.provider_id && requestedProviderId && attempt.provider_id !== requestedProviderId) {
      const providerChangeAllowed =
        (attempt.status === "created" ||
          attempt.status === "awaiting_payment" ||
          attempt.status === "payment_failed" ||
          attempt.status === "requires_action")

      if (!providerChangeAllowed) {
        return res.status(409).json({
          error: {
            code: "PAYMENT_ATTEMPT_PROVIDER_LOCKED",
            message: "An active payment attempt already exists for this cart. Continue it or let it expire before changing provider.",
          },
          payment_attempt: serializeAttempt(attempt, attempt.status ?? "awaiting_payment"),
        })
      }

      const previousSession = await readAttemptPaymentSession(req.scope, attempt)
      if (isPayPalProviderId(attempt.provider_id) && attempt.provider_payment_id) {
        const paypal = getConfiguredPayPalClient()
        let paypalOrder = null
        try {
          paypalOrder = paypal
            ? await paypal.retrieveOrder(attempt.provider_payment_id)
            : null
        } catch (error) {
          // The unapproved PayPal Order was already discarded. It is safe to
          // continue the requested provider switch with a new session.
          if (!isPayPalResourceNotFoundError(error)) throw error
        }
        if (["APPROVED", "COMPLETED"].includes(String(paypalOrder?.status ?? "").toUpperCase())) {
          return res.status(409).json({
            error: {
              code: "PAYMENT_ATTEMPT_PROVIDER_LOCKED",
              message: "PayPal has already approved this payment. Complete or recover the order instead of switching provider.",
            },
            payment_attempt: serializeAttempt(attempt, attempt.status ?? "requires_action"),
          })
        }
      }
      if (previousSession?.id) {
        await deletePaymentSessionsWorkflow(req.scope).run({
          input: { ids: [previousSession.id] },
        })
      }

      attempt = await patchAttempt(service, attempt, {
        provider_id: requestedProviderId,
        payment_session_id: null,
        provider_payment_id: null,
        last_error: null,
      })
      providerId = requestedProviderId
    }

    if (attempt && isCheckoutPaymentAttemptExpired(attempt)) {
      const existingSession = await readAttemptPaymentSession(req.scope, attempt)
      const existingIntent = isStripeProviderId(attempt.provider_id)
        ? await readStripePaymentIntentForAttempt(req.scope, attempt, existingSession)
        : null
      let existingPayPalOrder = null
      if (isPayPalProviderId(attempt.provider_id) && existingSession) {
        try {
          const paypalId = readPayPalOrderId(existingSession)
          const client = getConfiguredPayPalClient()
          existingPayPalOrder = paypalId && client ? await client.retrieveOrder(paypalId) : null
        } catch (error) {
          // The resource was never captured and PayPal has expired it. The
          // normal expiration branch below creates a new attempt.
          if (!isPayPalResourceNotFoundError(error)) throw error
        }
      }
      const externalStatus = existingIntent
        ? normalizeStripePaymentIntentStatus(existingIntent.status)
        : existingPayPalOrder
          ? normalizePayPalOrderStatus(existingPayPalOrder.status, readPayPalCaptureStatus(existingPayPalOrder))
          : null

      if (externalStatus === "payment_succeeded" || externalStatus === "payment_processing") {
        attempt = await patchAttempt(service, attempt, {
          status: externalStatus,
          ...(existingIntent?.id ? { provider_payment_id: existingIntent.id } : {}),
        })
        providerId = attempt.provider_id ?? providerId
      } else {
        await patchAttempt(service, attempt, {
          status: "expired",
          last_error: attempt.last_error ?? "Payment recovery window expired.",
        })
        attempt = null
      }
    }

    if (!attempt) {
      attempt = await createAttempt(req.scope, service, {
        cartId,
        storeId,
        customerId: cart.customer_id ?? authCustomerId,
        providerId,
      })
    } else if (cart.customer_id && attempt.customer_id !== cart.customer_id) {
      attempt = await patchAttempt(service, attempt, { customer_id: cart.customer_id })
    }

    let session = await readAttemptPaymentSession(req.scope, attempt)
    if (!reserveOnly && !session && !attempt.provider_payment_id) {
      await ensureCartPaymentReady(req.scope, cartId, providerId)
      session = await findCartPaymentSession(req.scope, cartId, providerId)
    } else if (!reserveOnly && !session && attempt.provider_payment_id) {
      await ensureCartPaymentReady(req.scope, cartId, providerId, attempt.provider_payment_id)
      session = await findCartPaymentSession(req.scope, cartId, providerId)
    }

    const linkPayPalSession = async () => {
      if (!session?.id || !isPayPalProviderId(providerId)) return
      const client = getConfiguredPayPalClient()
      if (!client) throw new Error("PayPal Sandbox is not configured on the backend")
      if (session.amount == null || !session.currency_code) {
        throw new Error("Payment session amount is unavailable. Refresh the cart total before paying.")
      }
      let paypalOrderId = readPayPalOrderId(session)
      let paypalOrderStatus: string | null = null
      if (!paypalOrderId) {
        const order = await client.createOrder({
          amount: session.amount,
          currencyCode: session.currency_code,
          referenceId: attempt.id,
          customId: session.id,
          brandName: process.env.PAYPAL_BRAND_NAME?.trim() || "CiiVerse",
          returnUrl:
            process.env.PAYPAL_RETURN_URL?.trim() ||
            `${process.env.STOREFRONT_URL?.trim() || "http://127.0.0.1:5174"}/checkout?paypal_return=1`,
          cancelUrl:
            process.env.PAYPAL_CANCEL_URL?.trim() ||
            `${process.env.STOREFRONT_URL?.trim() || "http://127.0.0.1:5174"}/checkout?paypal_cancel=1`,
          requestId: `paypal-order:${session.id}`,
        })
        paypalOrderId = order.id
        paypalOrderStatus = order.status ?? null
      }
      if (!paypalOrderId) throw new Error("PayPal did not return an order id")
      const linkedData = {
        ...(session.data ?? {}),
        id: paypalOrderId,
        paypal_order_id: paypalOrderId,
        paypal_status: paypalOrderStatus ?? session.data?.paypal_status ?? null,
        paypal_order_linked_by: "payment-recovery",
        medusa_payment_session_id: session.id,
        cart_id: cartId,
        payment_attempt_id: attempt.id,
        store_id: storeId,
      }
      const paymentModule = req.scope.resolve(Modules.PAYMENT) as unknown as {
        updatePaymentSession: (input: Record<string, unknown>) => Promise<unknown>
      }
      await paymentModule.updatePaymentSession({
        id: session.id,
        // CartDTO's calculated total is unavailable from cartModule.retrieveCart.
        // Reuse the persisted amount copied from the payment collection instead.
        amount: session.amount,
        currency_code: session.currency_code,
        data: linkedData,
      })
      session = await findCartPaymentSession(req.scope, cartId, providerId) ?? {
        ...session,
        data: linkedData,
      }
    }

    const replaceMissingExternalPayment = async () => {
      if (session?.id) {
        try {
          await deletePaymentSessionsWorkflow(req.scope).run({ input: { ids: [session.id] } })
        } catch (error) {
          // PayPal and Stripe may have already discarded an unapproved
          // resource. The Medusa session still needs to be replaced.
          if (!isMissingExternalPaymentResource(error)) throw error
        }
      }
      attempt = await patchAttempt(service, attempt, {
        payment_session_id: null,
        provider_payment_id: null,
        status: "created",
        last_error: "The previous payment session expired before payment was confirmed.",
      })
      session = null
      await ensureCartPaymentReady(req.scope, cartId, providerId)
      session = await findCartPaymentSession(req.scope, cartId, providerId)
      if (!session) throw new Error("Payment provider did not create a replacement payment session.")
      await linkPayPalSession()
    }

    if (session?.id && isPayPalProviderId(providerId)) {
      try {
        await linkPayPalSession()
      } catch (error) {
        if (!isPayPalResourceNotFoundError(error)) throw error
        await replaceMissingExternalPayment()
      }
    }

    let providerPaymentId =
      (session
        ? isPayPalProviderId(providerId)
          ? readPayPalOrderId(session)
          : readPaymentAttemptPaymentIntentId(session)
        : null) ?? attempt.provider_payment_id ?? null

    const syncAttemptSession = async () => {
      const paymentCollectionId = await readCartPaymentCollectionIdSafe(req.scope, cartId)
      if (
        attempt.payment_collection_id !== paymentCollectionId ||
        attempt.payment_session_id !== (session?.id ?? null) ||
        attempt.provider_payment_id !== providerPaymentId
      ) {
        attempt = await patchAttempt(service, attempt, {
          payment_collection_id: paymentCollectionId,
          payment_session_id: session?.id ?? null,
          provider_payment_id: providerPaymentId,
        })
      }
    }

    await syncAttemptSession()

    let status = (attempt.status ?? "created") as CheckoutPaymentAttemptStatus | string
    let paymentIntentStatus: string | null = null
    if (isStripeProviderId(providerId) && providerPaymentId) {
      try {
        const intent = await readStripePaymentIntentForAttempt(req.scope, {
          ...attempt,
          provider_payment_id: providerPaymentId,
        }, session)
        paymentIntentStatus = intent?.status ?? null
        const externalStatus = normalizeStripePaymentIntentStatus(paymentIntentStatus)
        if (externalStatus === "payment_succeeded" && attempt.completed_order_id) {
          status = "completed"
        } else if (attempt.status === "order_completion_failed" && externalStatus === "payment_succeeded") {
          status = "order_completion_failed"
        } else {
          status = externalStatus
        }
        attempt = await patchAttempt(service, attempt, {
          status,
          provider_payment_id: intent?.id ?? providerPaymentId,
        })
      } catch (error) {
        if (isStripeResourceNotFoundError(error)) {
          await replaceMissingExternalPayment()
          providerPaymentId = readPaymentAttemptPaymentIntentId(session)
          await syncAttemptSession()
          status = "awaiting_payment"
          attempt = await patchAttempt(service, attempt, { status })
        } else if (!session) {
          attempt = await patchAttempt(service, attempt, {
            status: "order_completion_failed",
            last_error: formatPaymentAttemptError(error),
          })
          status = "order_completion_failed"
        }
      }
    } else if (isPayPalProviderId(providerId) && providerPaymentId) {
      try {
        const client = getConfiguredPayPalClient()
        if (!client) throw new Error("PayPal Sandbox is not configured on the backend")
        const order = await client.retrieveOrder(providerPaymentId)
        const externalStatus = normalizePayPalOrderStatus(order.status, readPayPalCaptureStatus(order))
        if (externalStatus === "payment_succeeded" && attempt.completed_order_id) {
          status = "completed"
        } else if (attempt.status === "order_completion_failed" && externalStatus === "payment_succeeded") {
          status = "order_completion_failed"
        } else {
          status = externalStatus
        }
        attempt = await patchAttempt(service, attempt, { status })
      } catch (error) {
        if (isPayPalResourceNotFoundError(error)) {
          await replaceMissingExternalPayment()
          providerPaymentId = readPayPalOrderId(session)
          await syncAttemptSession()
          status = "awaiting_payment"
          attempt = await patchAttempt(service, attempt, { status })
        } else if (!session) {
          attempt = await patchAttempt(service, attempt, {
            status: "order_completion_failed",
            last_error: formatPaymentAttemptError(error),
          })
          status = "order_completion_failed"
        }
      }
    } else if (status === "created" && session) {
      status = "awaiting_payment"
      attempt = await patchAttempt(service, attempt, { status })
    }

    const clientSecret =
      session && typeof session.data?.client_secret === "string"
        ? session.data.client_secret
        : session && typeof session.data?.clientSecret === "string"
          ? session.data.clientSecret
          : null

    if (status === "completed" && attempt.completed_order_id) {
      return res.status(200).json(buildResponse({
        cartId,
        attempt,
        status,
        session,
        clientSecret,
        orderId: attempt.completed_order_id,
        paymentIntentStatus,
      }))
    }

    return res.status(200).json(buildResponse({
      cartId,
      attempt,
      status,
      session,
      clientSecret,
      paymentIntentStatus,
    }))
  } catch (error) {
    if (error instanceof CartStoreAccessError) {
      return res.status(403).json({
        error: { code: error.code, message: error.message },
      })
    }
    const message = formatPaymentAttemptError(error)
    console.error("[payment-recovery] failed:", message)
    return res.status(400).json({
      error: {
        code: "PAYMENT_RECOVERY_ERROR",
        message,
      },
    })
  }
}

async function readCartPaymentCollectionIdSafe(container: MedusaRequest["scope"], cartId: string) {
  try {
    return await readCartPaymentCollectionId(container as unknown as MedusaContainer, cartId)
  } catch {
    return null
  }
}
