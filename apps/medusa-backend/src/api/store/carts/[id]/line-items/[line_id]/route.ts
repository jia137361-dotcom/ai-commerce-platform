import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { updateLineItemInCartWorkflow } from "@medusajs/medusa/core-flows"
import {
  assertCartBelongsToCurrentStore,
  readCartStoreId,
} from "../../../../../../lib/assert-cart-store"
import { CartStoreAccessError } from "../../../../../../lib/cart-store-error"

const findLineItem = (
  cart: { items?: Array<{ id?: string }> | null },
  lineId: string
) => cart.items?.find((i) => i.id === lineId)

export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const cart_id = req.params.id as string
    const line_id = req.params.line_id as string
    const body = (req.body || {}) as { quantity?: number }

    if (typeof body.quantity !== "number" || body.quantity < 0) {
      return res.status(400).json({ error: "quantity must be a non-negative number" })
    }

    const cartModule = req.scope.resolve(Modules.CART)
    const cart = await cartModule.retrieveCart(cart_id, { relations: ["items"] })
    assertCartBelongsToCurrentStore(req, cart)

    if (!findLineItem(cart, line_id)) {
      return res.status(404).json({ error: "Line item not found on this cart" })
    }

    await updateLineItemInCartWorkflow(req.scope).run({
      input: {
        cart_id,
        item_id: line_id,
        update: { quantity: body.quantity },
      },
    })

    const cartAfter = await cartModule.retrieveCart(cart_id, {
      relations: ["items"],
    })
    const store_id = readCartStoreId(cartAfter)
    const lineItem = cartAfter.items?.find((i) => i.id === line_id)

    res.status(200).json({
      cart_id: cartAfter.id,
      store_id,
      line_item: lineItem ?? null,
      cart: cartAfter,
    })
  } catch (error: unknown) {
    if (error instanceof CartStoreAccessError) {
      return res.status(403).json({
        error: { code: error.code, message: error.message },
      })
    }
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("更新购物车行失败:", error)
    res.status(400).json({ error: message })
  }
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const cart_id = req.params.id as string
    const line_id = req.params.line_id as string

    const cartModule = req.scope.resolve(Modules.CART)
    const cart = await cartModule.retrieveCart(cart_id, { relations: ["items"] })
    assertCartBelongsToCurrentStore(req, cart)

    if (!findLineItem(cart, line_id)) {
      return res.status(404).json({ error: "Line item not found on this cart" })
    }

    await updateLineItemInCartWorkflow(req.scope).run({
      input: {
        cart_id,
        item_id: line_id,
        update: { quantity: 0 },
      },
    })

    const cartAfter = await cartModule.retrieveCart(cart_id, {
      relations: ["items"],
    })
    const store_id = readCartStoreId(cartAfter)

    res.status(200).json({
      cart_id: cartAfter.id,
      store_id,
      cart: cartAfter,
    })
  } catch (error: unknown) {
    if (error instanceof CartStoreAccessError) {
      return res.status(403).json({
        error: { code: error.code, message: error.message },
      })
    }
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("删除购物车行失败:", error)
    res.status(400).json({ error: message })
  }
}
