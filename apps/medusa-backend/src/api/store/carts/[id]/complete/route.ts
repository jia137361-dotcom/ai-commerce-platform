import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { completeCartWorkflow } from "@medusajs/medusa/core-flows"
import { assertCartBelongsToCurrentStore, readCartStoreId } from "../../../../../lib/assert-cart-store"
import { CartStoreAccessError } from "../../../../../lib/cart-store-error"
import { readOrderStoreId } from "../../../../../lib/order-store-context"
import {
  ensureCartPaymentReady,
  findCartPaymentSession,
  type CartWithPaymentCollection,
} from "../../../../../lib/ensure-cart-payment-ready"
import { readWorkflowErrorMessage } from "../../../../../lib/workflow-error"
import {
  markOrderPaidAndFulfillmentWaiting,
  providerDefersPaidUntilCapture,
  seedFulfillmentOrderIfMissing,
  setOrderPostCompletePendingMetadata,
  syncPaidIfPaymentAlreadyCaptured,
} from "../../../../../lib/sync-order-paid-fulfillment"
import { readOrderFulfillmentStatusMeta } from "../../../../../lib/order-custom-metadata"
import { syncFulfillmentPayloadFromOrder } from "../../../../../lib/sync-fulfillment-line-items"
import { pushOrderToS2bdiy } from "../../../../../lib/s2bdiy/push-s2b-order"
import { isS2bdiyEnabled } from "../../../../../modules/suppliers/s2bdiy/config"
import { syncCartLineItemShippingRequirements } from "../../../../../lib/sync-cart-line-item-shipping"
import { resolvePaymentMethodLabelFromClientSecret } from "../../../../../lib/stripe-payment-method-label"
import { applyPlatformCheckoutMetadata } from "../../../../../lib/marketplace/platform-checkout"
import { publishBuyerDesignsFromOrder } from "../../../../../lib/publish-buyer-designs-from-order"
import {
  formatPaymentAttemptError,
  isPayPalProviderId,
  isStripeProviderId,
  normalizePayPalOrderStatus,
  normalizeStripePaymentIntentStatus,
  readActiveCheckoutPaymentAttempt,
  readPayPalOrderId,
  readPayPalCaptureStatus,
  readStripePaymentIntentForAttempt,
  type CheckoutPaymentAttemptRecord,
} from "../../../../../lib/checkout-payment-attempts"
import { CHECKOUT_PAYMENT_ATTEMPTS_MODULE } from "../../../../../modules/checkout-payment-attempts"
import type CheckoutPaymentAttemptsModuleService from "../../../../../modules/checkout-payment-attempts/service"
import {
  ORDER_META_APPLIED_COUPON,
  ORDER_META_COUPON_DISCOUNT,
  ORDER_META_PLAN_DISCOUNT,
  redeemAppliedCouponOnOrder,
} from "../../../../../lib/store-coupons"
import { getConfiguredPayPalClient } from "../../../../../modules/paypal/client"

const DEFAULT_PAYMENT_PROVIDER = "pp_system_default"
const isStripeProvider = (providerId: string) => providerId.startsWith("pp_stripe_")

const readHeader = (req: MedusaRequest, name: string) => {
  const value = req.headers[name.toLowerCase()]
  return Array.isArray(value) ? value[0] : value
}

const validateCheckoutBridgeHeaders = (req: MedusaRequest) => {
  if (!readHeader(req, "x-publishable-api-key")) {
    return "x-publishable-api-key is required"
  }

  if (!readHeader(req, "x-store-id")) {
    return "X-Store-Id is required"
  }

  return null
}

type AuthenticatedRequest = MedusaRequest & {
  auth_context?: {
    actor_id?: string
  }
}

type CompleteCart = CartWithPaymentCollection & {
  customer_id?: string | null
  total?: number | string | null
  shipping_address?: unknown | null
  shipping_methods?: unknown[] | null
  items?: Array<{ requires_shipping?: boolean | null }> | null
}

type CompleteOrder = {
  id: string
  customer_id?: string | null
  email?: string | null
  metadata?: Record<string, unknown> | null
}

const readAuthCustomerId = (req: MedusaRequest) =>
  (req as AuthenticatedRequest).auth_context?.actor_id

const ORDER_META_CHECKOUT_CART_ID = "checkout_cart_id"

const isAlreadyCompletedError = (message: string) =>
  /already.*complet|cart.*complet/i.test(message)

const listCandidateOrdersForCart = async (
  orderModule: {
    listOrders?: (filters: Record<string, unknown>, config?: Record<string, unknown>) => Promise<CompleteOrder[]>
  },
  cart: CompleteCart
): Promise<CompleteOrder[]> => {
  if (!orderModule.listOrders) return []
  const filters: Record<string, unknown> = {}
  if (cart.customer_id) {
    filters.customer_id = cart.customer_id
  } else if (cart.email) {
    filters.email = cart.email
  } else {
    return []
  }

  return orderModule.listOrders(filters, {
    select: ["id", "customer_id", "email", "metadata"],
    order: { created_at: "DESC" },
    take: 100,
  })
}

const findCompletedOrderForCart = async (
  orderModule: {
    listOrders?: (filters: Record<string, unknown>, config?: Record<string, unknown>) => Promise<CompleteOrder[]>
  },
  cart: CompleteCart,
  storeId: string,
  cartId: string
) => {
  const candidates = await listCandidateOrdersForCart(orderModule, cart)
  return candidates.find((order) => {
    const metadata = order.metadata ?? {}
    return metadata[ORDER_META_CHECKOUT_CART_ID] === cartId && readOrderStoreId(order) === storeId
  }) ?? null
}

const buildCompleteResponse = (input: {
  order: CompleteOrder
  cart: CompleteCart
  cartId: string
  storeId: string
  providerId: string
  paymentMethodLabel: string | null
  alreadyCompleted: boolean
}) => ({
  status: "completed",
  cart_id: input.cartId,
  order_id: input.order.id,
  already_completed: input.alreadyCompleted,
  store_id: input.storeId,
  cart_customer_id: input.cart.customer_id ?? null,
  order_customer_id: input.order.customer_id ?? null,
  payment_provider_id: input.providerId,
  payment_method_label: input.paymentMethodLabel,
  payment_status: (input.order.metadata as Record<string, unknown> | null)?.payment_status ?? null,
  fulfillment_status: readOrderFulfillmentStatusMeta(input.order.metadata as Record<string, unknown> | null),
  order: input.order,
})

type AttemptService = CheckoutPaymentAttemptsModuleService & {
  updateCheckoutPaymentAttempts: (input: Record<string, unknown>) => Promise<CheckoutPaymentAttemptRecord[] | CheckoutPaymentAttemptRecord>
}

const updateCheckoutPaymentAttempt = async (
  req: MedusaRequest,
  input: {
    cartId: string
    storeId: string
    status: string
    orderId?: string | null
    error?: unknown
  }
) => {
  try {
    const attempt = await readActiveCheckoutPaymentAttempt(req.scope, {
      cartId: input.cartId,
      storeId: input.storeId,
    })
    if (!attempt) return
    const service = req.scope.resolve(CHECKOUT_PAYMENT_ATTEMPTS_MODULE) as AttemptService
    await service.updateCheckoutPaymentAttempts({
      id: attempt.id,
      status: input.status,
      completed_order_id: input.orderId ?? attempt.completed_order_id ?? null,
      last_error: input.error ? formatPaymentAttemptError(input.error) : null,
    })
  } catch (error) {
    console.warn("[checkout-complete] unable to update payment attempt", formatPaymentAttemptError(error))
  }
}

const providerPaymentWasSuccessful = async (
  req: MedusaRequest,
  cartId: string,
  storeId: string,
  providerId: string
) => {
  let attempt: CheckoutPaymentAttemptRecord | null = null
  try {
    attempt = await readActiveCheckoutPaymentAttempt(req.scope, { cartId, storeId })
    const session = await findCartPaymentSession(req.scope, cartId, providerId)
    if (isStripeProviderId(providerId)) {
      const intent = await readStripePaymentIntentForAttempt(req.scope, attempt ?? {
        id: "",
        cart_id: cartId,
        store_id: storeId,
        provider_id: providerId,
      }, session)
      return normalizeStripePaymentIntentStatus(intent?.status) === "payment_succeeded"
    }
    if (isPayPalProviderId(providerId)) {
      const paypalOrderId = attempt?.provider_payment_id ?? readPayPalOrderId(session)
      const client = getConfiguredPayPalClient()
      if (!paypalOrderId || !client) return false
      const order = await client.retrieveOrder(paypalOrderId)
      return normalizePayPalOrderStatus(order.status, readPayPalCaptureStatus(order)) === "payment_succeeded"
    }
  } catch (error) {
    console.warn("[checkout-complete] unable to verify provider status after complete failure", {
      provider_id: providerId,
      message: formatPaymentAttemptError(error),
    })
  }
  return attempt?.status === "payment_succeeded" || attempt?.status === "order_completion_failed"
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const headerError = validateCheckoutBridgeHeaders(req)
    if (headerError) {
      return res.status(401).json({
        error: { code: "CHECKOUT_HEADER_REQUIRED", message: headerError },
      })
    }

    const cartId = req.params.id as string
    const body = (req.body || {}) as {
      payment_provider_id?: string
      platform_checkout_id?: string
      platform_checkout_index?: number
      platform_checkout_count?: number
    }
    const providerId = body.payment_provider_id?.trim() || DEFAULT_PAYMENT_PROVIDER

    const cartModule = req.scope.resolve(Modules.CART)
    const orderModule = req.scope.resolve(Modules.ORDER)
    let cart = (await cartModule.retrieveCart(cartId, {
      relations: ["items", "shipping_address", "shipping_methods"],
    })) as CompleteCart

    assertCartBelongsToCurrentStore(req, cart)
    const storeId = readCartStoreId(cart)

    const synced = await syncCartLineItemShippingRequirements(req.scope, cartId, cart.items)
    if (synced) {
      cart = (await cartModule.retrieveCart(cartId, {
        relations: ["items", "shipping_address", "shipping_methods"],
      })) as CompleteCart
    }

    const authCustomerId = readAuthCustomerId(req)
    const requiresShipping = Boolean(cart.items?.some((item) => item.requires_shipping))
    const addressPresent = Boolean(cart.shipping_address)
    const shippingMethodCount = cart.shipping_methods?.length ?? 0
    if (process.env.NODE_ENV !== "production") {
      console.info("[checkout-complete] before complete", {
        cart_id: cartId,
        auth_customer_id: authCustomerId ?? null,
        cart_customer_id_before_complete: cart.customer_id ?? null,
        store_id: storeId,
        requires_shipping: requiresShipping,
        address_present: addressPresent,
        shipping_method_count: shippingMethodCount,
      })
    }

    if (!cart.items?.length) {
      return res.status(400).json({ error: "Cart has no line items" })
    }

    if (authCustomerId && cart.customer_id !== authCustomerId) {
      return res.status(403).json({
        error: {
          code: "CART_CUSTOMER_REQUIRED",
          message: "Authenticated checkout requires the cart to be bound to the current customer before complete.",
        },
      })
    }

    if (!cart.email || !cart.email.includes("@")) {
      return res.status(400).json({
        error: {
          code: "CART_CONTACT_REQUIRED",
          message: "Cart email is required before complete",
        },
      })
    }

    if (requiresShipping && !addressPresent) {
      return res.status(400).json({
        error: {
          code: "CART_SHIPPING_ADDRESS_REQUIRED",
          message: "Shipping address is required before complete.",
        },
      })
    }

    if (requiresShipping && shippingMethodCount === 0) {
      return res.status(400).json({
        error: {
          code: "CART_SHIPPING_METHOD_REQUIRED",
          message: "Shipping method is required before complete.",
        },
      })
    }

    let paymentMethodLabel: string | null = null
    const alreadyCompletedOrder = await findCompletedOrderForCart(orderModule, cart, storeId, cartId)
    if (alreadyCompletedOrder) {
      await updateCheckoutPaymentAttempt(req, {
        cartId,
        storeId,
        status: "completed",
        orderId: alreadyCompletedOrder.id,
      })
      return res.status(200).json(buildCompleteResponse({
        order: alreadyCompletedOrder,
        cart,
        cartId,
        storeId,
        providerId,
        paymentMethodLabel,
        alreadyCompleted: true,
      }))
    }

    if (isStripeProvider(providerId)) {
      const stripeSession = await findCartPaymentSession(req.scope, cartId, providerId)
      const clientSecret = stripeSession?.data?.client_secret
      if (!stripeSession || typeof clientSecret !== "string" || !clientSecret.startsWith("pi_")) {
        return res.status(400).json({
          error: {
            code: "STRIPE_PAYMENT_SESSION_REQUIRED",
            message: "Initialize and confirm a Stripe payment session before completing this cart.",
          },
        })
      }
      const paymentIntent = await readStripePaymentIntentForAttempt(req.scope, {
        id: "",
        cart_id: cartId,
        store_id: storeId,
        provider_id: providerId,
      }, stripeSession)
      const cartTotal = Number(cart.total)
      if (paymentIntent && Number.isSafeInteger(paymentIntent.amount) && Number.isSafeInteger(cartTotal) && paymentIntent.amount !== cartTotal) {
        return res.status(409).json({
          error: {
            code: "STRIPE_PAYMENT_AMOUNT_MISMATCH",
            message: "Checkout total changed. Refresh checkout before confirming payment.",
          },
        })
      }
      try {
        paymentMethodLabel = await resolvePaymentMethodLabelFromClientSecret(clientSecret)
      } catch (error) {
        console.warn("[checkout-complete] unable to resolve Stripe payment method label", error)
      }
    } else {
      // Reuse the active attempt's external PayPal order when Medusa only lost
      // a processable session row. Creating a second PayPal order after the
      // buyer already approved the first one leaves checkout unrecoverable.
      let existingProviderPaymentId: string | undefined
      if (isPayPalProviderId(providerId)) {
        const attempt = await readActiveCheckoutPaymentAttempt(req.scope, { cartId, storeId })
        if (attempt?.provider_id === providerId && attempt.provider_payment_id) {
          existingProviderPaymentId = attempt.provider_payment_id
        } else {
          const session = await findCartPaymentSession(req.scope, cartId, providerId)
          existingProviderPaymentId = readPayPalOrderId(session) ?? undefined
        }
      }
      await ensureCartPaymentReady(req.scope, cartId, providerId, existingProviderPaymentId)
    }

    let result: { id?: string }
    try {
      const workflowResult = await completeCartWorkflow(req.scope).run({
        input: { id: cartId },
      })
      result = workflowResult.result as { id?: string }
    } catch (workflowError) {
      const existingOrder = await findCompletedOrderForCart(orderModule, cart, storeId, cartId)
      const message = readWorkflowErrorMessage(workflowError)
      if (existingOrder && isAlreadyCompletedError(message)) {
        await updateCheckoutPaymentAttempt(req, {
          cartId,
          storeId,
          status: "completed",
          orderId: existingOrder.id,
        })
        return res.status(200).json(buildCompleteResponse({
          order: existingOrder,
          cart,
          cartId,
          storeId,
          providerId,
          paymentMethodLabel,
          alreadyCompleted: true,
        }))
      }
      if (await providerPaymentWasSuccessful(req, cartId, storeId, providerId)) {
        await updateCheckoutPaymentAttempt(req, {
          cartId,
          storeId,
          status: "order_completion_failed",
          error: workflowError,
        })
      }
      throw workflowError
    }

    const orderId = result.id as string
    let completedOrder = (await orderModule.retrieveOrder(orderId)) as CompleteOrder

    if (cart.customer_id) {
      if (completedOrder.customer_id && completedOrder.customer_id !== cart.customer_id) {
        return res.status(400).json({
          error: {
            code: "ORDER_CUSTOMER_MISMATCH",
            message: "Completed order customer does not match the checkout cart customer.",
          },
        })
      }

      if (!completedOrder.customer_id) {
        console.warn("[checkout-complete] completed order missing customer_id; applying trusted cart customer_id", {
          order_id: orderId,
          cart_id: cartId,
          customer_id: cart.customer_id,
        })
        await orderModule.updateOrders(orderId, { customer_id: cart.customer_id } as never)
        completedOrder = (await orderModule.retrieveOrder(orderId)) as CompleteOrder
        if (completedOrder.customer_id !== cart.customer_id) {
          throw new Error("Completed order customer_id could not be persisted")
        }
      }
    }

    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data: cartPaymentRows } = (await query.graph({
      entity: "cart",
      fields: ["payment_collection.id"],
      filters: { id: cartId },
    })) as { data: Array<{ payment_collection?: { id?: string } | null }> }
    const paymentCollectionId = cartPaymentRows[0]?.payment_collection?.id ?? null

    await setOrderPostCompletePendingMetadata(req.scope, orderId, storeId)
    completedOrder = (await orderModule.retrieveOrder(orderId)) as CompleteOrder
    await orderModule.updateOrders(orderId, {
      metadata: {
        ...(completedOrder.metadata ?? {}),
        [ORDER_META_CHECKOUT_CART_ID]: cartId,
      },
    } as never)
    completedOrder = (await orderModule.retrieveOrder(orderId)) as CompleteOrder
    try {
      const discount = await redeemAppliedCouponOnOrder(req.scope, {
        cartId,
        orderId,
        customerId: authCustomerId ?? cart.customer_id ?? null,
        storeId,
      })
      if (discount.discount_total > 0 || discount.applied_coupon) {
        const existingMeta = (completedOrder.metadata ?? {}) as Record<string, unknown>
        await orderModule.updateOrders(orderId, {
          metadata: {
            ...existingMeta,
            [ORDER_META_COUPON_DISCOUNT]: discount.coupon_discount,
            [ORDER_META_PLAN_DISCOUNT]: discount.plan_discount,
            discount_total_major: discount.discount_total,
            payable_total_major: discount.payable_total,
            ...(discount.applied_coupon
              ? { [ORDER_META_APPLIED_COUPON]: discount.applied_coupon }
              : {}),
          },
        } as never)
        completedOrder = (await orderModule.retrieveOrder(orderId)) as CompleteOrder
      }
    } catch (error) {
      console.warn("[checkout-complete] unable to redeem coupon / plan discount", error)
    }
    try {
      await publishBuyerDesignsFromOrder(req.scope, { orderId, storeId })
    } catch (error) {
      console.warn("[checkout-complete] unable to publish buyer designs", error)
    }
    if (
      body.platform_checkout_id &&
      typeof body.platform_checkout_index === "number" &&
      typeof body.platform_checkout_count === "number"
    ) {
      await applyPlatformCheckoutMetadata(req.scope, orderId, {
        platform_checkout_id: body.platform_checkout_id.trim(),
        platform_checkout_index: body.platform_checkout_index,
        platform_checkout_count: body.platform_checkout_count,
      })
      completedOrder = (await orderModule.retrieveOrder(orderId)) as CompleteOrder
    }
    if (paymentMethodLabel) {
      const existingMeta = (completedOrder.metadata ?? {}) as Record<string, unknown>
      await orderModule.updateOrders(orderId, {
        metadata: { ...existingMeta, payment_method_label: paymentMethodLabel },
      } as never)
      completedOrder = (await orderModule.retrieveOrder(orderId)) as CompleteOrder
    }
    await seedFulfillmentOrderIfMissing(req.scope, {
      orderId,
      storeId,
      paymentCollectionId,
    })
    await syncFulfillmentPayloadFromOrder(req.scope, orderId)

    if (!providerDefersPaidUntilCapture(providerId)) {
      await markOrderPaidAndFulfillmentWaiting(req.scope, orderId, "non_stripe_provider_after_complete")
      if (isS2bdiyEnabled()) {
        try {
          await pushOrderToS2bdiy(req.scope, orderId)
        } catch (error) {
          console.error("S2BDIY push after complete failed:", error)
        }
      }
    } else {
      await syncPaidIfPaymentAlreadyCaptured(req.scope, orderId, paymentCollectionId)
    }

    const order = await orderModule.retrieveOrder(orderId)
    if (readOrderStoreId(order) !== storeId) {
      throw new Error("Completed order store_id could not be persisted")
    }
    if (cart.customer_id && (order as CompleteOrder).customer_id !== cart.customer_id) {
      throw new Error("Completed order customer_id does not match the checkout cart customer")
    }
    if (process.env.NODE_ENV !== "production") {
      console.info("[checkout-complete] after complete", {
        cart_id: cartId,
        auth_customer_id: authCustomerId ?? null,
        cart_customer_id_before_complete: cart.customer_id ?? null,
        address_present: addressPresent,
        shipping_method_count: shippingMethodCount,
        order_id: order.id,
        order_customer_id_after_complete: (order as CompleteOrder).customer_id ?? null,
        order_store_id: readOrderStoreId(order),
      })
    }

    await updateCheckoutPaymentAttempt(req, {
      cartId,
      storeId,
      status: "completed",
      orderId,
    })

    res.status(200).json(buildCompleteResponse({
      order: order as CompleteOrder,
      cart,
      cartId,
      storeId,
      providerId,
      paymentMethodLabel,
      alreadyCompleted: false,
    }))
  } catch (error: unknown) {
    if (error instanceof CartStoreAccessError) {
      return res.status(403).json({
        error: { code: error.code, message: error.message },
      })
    }
    const message = readWorkflowErrorMessage(error)
    console.error("完成购物车失败:", error)
    res.status(400).json({
      error: {
        code: "CART_COMPLETE_ERROR",
        message,
      },
    })
  }
}
