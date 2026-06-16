import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { listShippingOptionsForCartWorkflow } from "@medusajs/medusa/core-flows"
import {
  assertCartBelongsToCurrentStore,
  readCartStoreId,
} from "../../../../../lib/assert-cart-store"
import { CartStoreAccessError } from "../../../../../lib/cart-store-error"
import { readWorkflowErrorMessage } from "../../../../../lib/workflow-error"

type ShippingOptionResult = {
  id?: string
  name?: string
  amount?: number | null
  calculated_price?: {
    calculated_amount?: number | null
  } | null
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

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const headerError = validateCheckoutBridgeHeaders(req)
    if (headerError) {
      return res.status(401).json({
        error: { code: "CHECKOUT_HEADER_REQUIRED", message: headerError },
      })
    }

    const cart_id = req.params.id as string
    const cartModule = req.scope.resolve(Modules.CART)
    const cart = await cartModule.retrieveCart(cart_id, {
      relations: ["items", "shipping_address"],
    })
    assertCartBelongsToCurrentStore(req, cart)

    const { result } = await listShippingOptionsForCartWorkflow(req.scope).run({
      input: { cart_id },
    })

    const currency_code = cart.currency_code
    const shipping_options = (result as ShippingOptionResult[]).map((option) => ({
      id: option.id,
      name: option.name,
      amount: option.amount ?? option.calculated_price?.calculated_amount ?? 0,
      currency_code,
    }))

    res.status(200).json({
      cart_id: cart.id,
      store_id: readCartStoreId(cart),
      shipping_options,
      requires_shipping_method: shipping_options.length > 0,
    })
  } catch (error: unknown) {
    if (error instanceof CartStoreAccessError) {
      return res.status(403).json({
        error: { code: error.code, message: error.message },
      })
    }

    const message = readWorkflowErrorMessage(error)
    console.error("获取购物车配送选项失败:", error)
    res.status(400).json({ error: { code: "CART_SHIPPING_OPTIONS_ERROR", message } })
  }
}
