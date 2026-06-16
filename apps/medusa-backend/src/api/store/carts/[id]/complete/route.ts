import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { completeCartWorkflow } from "@medusajs/medusa/core-flows"
import { assertCartBelongsToCurrentStore, readCartStoreId } from "../../../../../lib/assert-cart-store"
import { CartStoreAccessError } from "../../../../../lib/cart-store-error"
import {
  ensureCartPaymentReady,
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
import { getS2bdiyConfig } from "../../../../../modules/suppliers/s2bdiy/config"

const DEFAULT_PAYMENT_PROVIDER = "pp_system_default"

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
    const cart = (await cartModule.retrieveCart(cartId, {
      relations: ["items"],
    })) as CartWithPaymentCollection

    assertCartBelongsToCurrentStore(req, cart)
    const storeId = readCartStoreId(cart)

    if (!cart.items?.length) {
      return res.status(400).json({ error: "Cart has no line items" })
    }

    await ensureCartPaymentReady(req.scope, cartId, providerId)

    const { result } = await completeCartWorkflow(req.scope).run({
      input: { id: cartId },
    })

    const orderId = result.id as string

    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data: cartPaymentRows } = (await query.graph({
      entity: "cart",
      fields: ["payment_collection.id"],
      filters: { id: cartId },
    })) as { data: Array<{ payment_collection?: { id?: string } | null }> }
    const paymentCollectionId = cartPaymentRows[0]?.payment_collection?.id ?? null

    await setOrderPostCompletePendingMetadata(req.scope, orderId)
    await seedFulfillmentOrderIfMissing(req.scope, {
      orderId,
      storeId,
      paymentCollectionId,
    })
    await syncFulfillmentPayloadFromOrder(req.scope, orderId)

    if (!providerDefersPaidUntilCapture(providerId)) {
      await markOrderPaidAndFulfillmentWaiting(req.scope, orderId, "non_stripe_provider_after_complete")
      if (getS2bdiyConfig()) {
        try {
          await pushOrderToS2bdiy(req.scope, orderId)
        } catch (error) {
          console.error("S2BDIY push after complete failed:", error)
        }
      }
    } else {
      await syncPaidIfPaymentAlreadyCaptured(req.scope, orderId, paymentCollectionId)
    }

    const orderModule = req.scope.resolve(Modules.ORDER)
    const order = await orderModule.retrieveOrder(orderId)

    res.status(200).json({
      order_id: order.id,
      store_id: storeId,
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
