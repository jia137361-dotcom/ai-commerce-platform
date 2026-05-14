import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { assertCartBelongsToCurrentStore } from "../../../../../lib/assert-cart-store"
import addLineItemWorkflow from "../../../../../workflows/add-line-item"
import { CartStoreAccessError, CartStoreMismatchError } from "../../../../../lib/cart-store-error"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const cart_id = req.params.id as string
    const body = (req.body || {}) as { variant_id?: string; quantity?: number }

    if (!body.variant_id) {
      return res.status(400).json({ error: "variant_id is required" })
    }

    const cartModule = req.scope.resolve(Modules.CART)
    const cart = await cartModule.retrieveCart(cart_id)
    assertCartBelongsToCurrentStore(req, cart)

    const { result } = await addLineItemWorkflow(req.scope).run({
      input: {
        cart_id,
        variant_id: body.variant_id,
        quantity: body.quantity ?? 1,
      },
    })

    const cartOut = result.cart
    const meta = cartOut.metadata as Record<string, unknown> | null | undefined
    const store_id = typeof meta?.store_id === "string" ? meta.store_id : undefined

    res.status(200).json({
      cart_id: cartOut.id,
      store_id,
      line_item: result.lineItem,
    })
  } catch (error: unknown) {
    if (error instanceof CartStoreMismatchError) {
      return res.status(400).json({
        error: {
          code: error.code,
          message: error.message,
        },
      })
    }
    if (error instanceof CartStoreAccessError) {
      return res.status(403).json({
        error: { code: error.code, message: error.message },
      })
    }
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("加入购物车商品失败:", error)
    res.status(400).json({ error: message })
  }
}
