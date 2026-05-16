import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import {
  assertCartBelongsToCurrentStore,
  readCartStoreId,
} from "../../../../lib/assert-cart-store"
import { CartStoreAccessError } from "../../../../lib/cart-store-error"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const cartId = req.params.id as string
    const cartModule = req.scope.resolve(Modules.CART)
    const cart = await cartModule.retrieveCart(cartId, {
      relations: ["items", "shipping_address", "billing_address"],
    })

    assertCartBelongsToCurrentStore(req, cart)

    const store_id = readCartStoreId(cart)
    res.status(200).json({
      cart_id: cart.id,
      store_id,
      ...cart,
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
