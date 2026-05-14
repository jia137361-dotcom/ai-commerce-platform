import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { completeCartWorkflow } from "@medusajs/medusa/core-flows"
import { assertCartBelongsToCurrentStore, readCartStoreId } from "../../../../../lib/assert-cart-store"
import { CartStoreAccessError } from "../../../../../lib/cart-store-error"
import {
  ensureCartPaymentReady,
  type CartWithPaymentCollection,
} from "../../../../../lib/ensure-cart-payment-ready"
import {
  markOrderPaidAndFulfillmentWaiting,
  providerDefersPaidUntilCapture,
  seedFulfillmentOrderIfMissing,
  setOrderPostCompletePendingMetadata,
  syncPaidIfPaymentAlreadyCaptured,
} from "../../../../../lib/sync-order-paid-fulfillment"

const DEFAULT_PAYMENT_PROVIDER = "pp_system_default"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const cartId = req.params.id as string
    const body = (req.body || {}) as { payment_provider_id?: string }
    const providerId = body.payment_provider_id?.trim() || DEFAULT_PAYMENT_PROVIDER

    const cartModule = req.scope.resolve(Modules.CART)
    const cart = (await cartModule.retrieveCart(cartId, {
      relations: ["items", "payment_collection", "payment_collection.payment_sessions"],
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

    const cartAfter = (await cartModule.retrieveCart(cartId, {
      relations: ["payment_collection"],
    })) as CartWithPaymentCollection
    const paymentCollectionId = cartAfter.payment_collection?.id ?? null

    await setOrderPostCompletePendingMetadata(req.scope, orderId)
    await seedFulfillmentOrderIfMissing(req.scope, {
      orderId,
      storeId,
      paymentCollectionId,
    })

    if (!providerDefersPaidUntilCapture(providerId)) {
      await markOrderPaidAndFulfillmentWaiting(req.scope, orderId, "non_stripe_provider_after_complete")
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
      fulfillment_status: (order.metadata as Record<string, unknown> | null)?.fulfillment_status ?? null,
      order,
    })
  } catch (error: unknown) {
    if (error instanceof CartStoreAccessError) {
      return res.status(403).json({
        error: { code: error.code, message: error.message },
      })
    }
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("完成购物车失败:", error)
    res.status(400).json({ error: message })
  }
}
