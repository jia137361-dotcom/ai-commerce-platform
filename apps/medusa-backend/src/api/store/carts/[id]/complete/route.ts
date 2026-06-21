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
  shipping_address?: unknown | null
  shipping_methods?: unknown[] | null
  items?: Array<{ requires_shipping?: boolean | null }> | null
}

type CompleteOrder = {
  id: string
  customer_id?: string | null
  metadata?: Record<string, unknown> | null
}

const readAuthCustomerId = (req: MedusaRequest) =>
  (req as AuthenticatedRequest).auth_context?.actor_id

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const headerError = validateCheckoutBridgeHeaders(req)
    if (headerError) {
      return res.status(401).json({
        error: { code: "CHECKOUT_HEADER_REQUIRED", message: headerError },
      })
    }

    const cartId = req.params.id as string
    const body = (req.body || {}) as { payment_provider_id?: string }
    const providerId = body.payment_provider_id?.trim() || DEFAULT_PAYMENT_PROVIDER

    const cartModule = req.scope.resolve(Modules.CART)
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
    } else {
      await ensureCartPaymentReady(req.scope, cartId, providerId)
    }

    const { result } = await completeCartWorkflow(req.scope).run({
      input: { id: cartId },
    })

    const orderId = result.id as string
    const orderModule = req.scope.resolve(Modules.ORDER)
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

    res.status(200).json({
      order_id: order.id,
      store_id: storeId,
      cart_customer_id: cart.customer_id ?? null,
      order_customer_id: (order as CompleteOrder).customer_id ?? null,
      payment_provider_id: providerId,
      payment_status: (order.metadata as Record<string, unknown> | null)?.payment_status ?? null,
      fulfillment_status: readOrderFulfillmentStatusMeta(order.metadata as Record<string, unknown> | null),
      order,
    })
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
