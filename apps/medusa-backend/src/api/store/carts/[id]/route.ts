import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import {
  assertCartBelongsToCurrentStore,
  readCartStoreId,
} from "../../../../lib/assert-cart-store"
import { CartStoreAccessError } from "../../../../lib/cart-store-error"
import { enrichOrderLineItemsWithImages } from "../../../../lib/order-line-item-display"
import { syncCartLineItemShippingRequirements } from "../../../../lib/sync-cart-line-item-shipping"
import { getStoreCoreService } from "../../../_helpers/store-core"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const cartId = req.params.id as string
    const cartModule = req.scope.resolve(Modules.CART)
    let cart = await cartModule.retrieveCart(cartId, {
      relations: ["items", "shipping_address", "billing_address"],
    })

    assertCartBelongsToCurrentStore(req, cart)

    const synced = await syncCartLineItemShippingRequirements(req.scope, cartId, cart.items)
    if (synced) {
      cart = await cartModule.retrieveCart(cartId, {
        relations: ["items", "shipping_address", "billing_address"],
      })
    }

    const store_id = readCartStoreId(cart)
    const storeCore = getStoreCoreService(req)
    const items = cart.items?.length
      ? await enrichOrderLineItemsWithImages(storeCore, cart.items)
      : cart.items

    res.status(200).json({
      cart_id: cart.id,
      store_id,
      ...cart,
      items,
    })
  } catch (error: unknown) {
    if (error instanceof CartStoreAccessError) {
      return res.status(403).json({
        error: { code: error.code, message: error.message },
      })
    }
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("获取购物车失败:", error)
    res.status(400).json({ error: message })
  }
}
