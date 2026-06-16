import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { addShippingMethodToCartWorkflow } from "@medusajs/medusa/core-flows"
import {
  assertCartBelongsToCurrentStore,
  readCartStoreId,
} from "../../../../../lib/assert-cart-store"
import { CartStoreAccessError } from "../../../../../lib/cart-store-error"
import { readWorkflowErrorMessage } from "../../../../../lib/workflow-error"

type ShippingMethodBody = {
  option_id?: string
}

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

    const cart_id = req.params.id as string
    const body = (req.body || {}) as ShippingMethodBody

    if (!body.option_id) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "option_id is required" },
      })
    }

    const cartModule = req.scope.resolve(Modules.CART)
    const cart = await cartModule.retrieveCart(cart_id, {
      relations: ["items", "shipping_address", "shipping_methods"],
    })
    assertCartBelongsToCurrentStore(req, cart)

    await addShippingMethodToCartWorkflow(req.scope).run({
      input: {
        cart_id,
        options: [{ id: body.option_id }],
      },
    })

    const cartAfter = await cartModule.retrieveCart(cart_id, {
      relations: ["items", "shipping_address", "shipping_methods"],
    })

    res.status(200).json({
      cart_id: cartAfter.id,
      store_id: readCartStoreId(cartAfter),
      cart: cartAfter,
    })
  } catch (error: unknown) {
    if (error instanceof CartStoreAccessError) {
      return res.status(403).json({
        error: { code: error.code, message: error.message },
      })
    }

    const message = readWorkflowErrorMessage(error)
    console.error("选择购物车配送方式失败:", error)
    res.status(400).json({ error: { code: "CART_SHIPPING_METHOD_ERROR", message } })
  }
}
