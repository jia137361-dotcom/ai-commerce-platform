import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import {
  assertCartBelongsToCurrentStore,
  readCartStoreId,
} from "../../../../../lib/assert-cart-store"
import { CartStoreAccessError } from "../../../../../lib/cart-store-error"
import { resolveCustomerId } from "../../../../../lib/customer-session"
import { readWorkflowErrorMessage } from "../../../../../lib/workflow-error"

type CustomerCart = {
  id: string
  customer_id?: string | null
  metadata?: Record<string, unknown> | null
}

const readHeader = (req: MedusaRequest, name: string) => {
  const value = req.headers[name.toLowerCase()]
  return Array.isArray(value) ? value[0] : value
}

const validateHeaders = (req: MedusaRequest) => {
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
    const headerError = validateHeaders(req)
    if (headerError) {
      return res.status(401).json({
        error: { code: "CHECKOUT_HEADER_REQUIRED", message: headerError },
      })
    }

    const customerId = resolveCustomerId(req)
    if (!customerId) {
      return res.status(401).json({
        error: {
          code: "CUSTOMER_SESSION_REQUIRED",
          message: "Customer session is required to bind a cart.",
        },
      })
    }

    const cartId = req.params.id as string
    const cartModule = req.scope.resolve(Modules.CART)
    const cart = (await cartModule.retrieveCart(cartId, {
      relations: ["items", "shipping_address", "billing_address", "shipping_methods"],
    })) as CustomerCart

    assertCartBelongsToCurrentStore(req, cart)

    if (cart.customer_id && cart.customer_id !== customerId) {
      return res.status(403).json({
        error: {
          code: "CART_CUSTOMER_MISMATCH",
          message: "Cart is already bound to another customer.",
        },
      })
    }

    if (!cart.customer_id) {
      await cartModule.updateCarts(cartId, { customer_id: customerId } as never)
    }

    const cartAfter = (await cartModule.retrieveCart(cartId, {
      relations: ["items", "shipping_address", "billing_address", "shipping_methods"],
    })) as CustomerCart

    if (cartAfter.customer_id !== customerId) {
      throw new Error("Cart customer_id could not be persisted")
    }

    res.status(200).json({
      cart_id: cartAfter.id,
      store_id: readCartStoreId(cartAfter),
      customer_id: customerId,
      cart: cartAfter,
    })
  } catch (error: unknown) {
    if (error instanceof CartStoreAccessError) {
      return res.status(403).json({
        error: { code: error.code, message: error.message },
      })
    }

    const message = readWorkflowErrorMessage(error)
    console.error("绑定购物车买家失败:", error)
    res.status(400).json({
      error: { code: "CART_CUSTOMER_BIND_ERROR", message },
    })
  }
}
