import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { updateCartWorkflow } from "@medusajs/medusa/core-flows"
import {
  assertCartBelongsToCurrentStore,
  readCartStoreId,
} from "../../../../../lib/assert-cart-store"
import { CartStoreAccessError } from "../../../../../lib/cart-store-error"
import { readWorkflowErrorMessage } from "../../../../../lib/workflow-error"

type CartContactUpdateBody = {
  email?: string
  phone?: string
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const readHeader = (req: MedusaRequest, name: string) => {
  const value = req.headers[name.toLowerCase()]
  return Array.isArray(value) ? value[0] : value
}

export const normalizeContactEmail = (email: unknown) =>
  typeof email === "string" ? email.trim().toLowerCase() : ""

export const validateCheckoutContactHeaders = (req: MedusaRequest) => {
  if (!readHeader(req, "x-publishable-api-key")) {
    return "x-publishable-api-key is required"
  }

  if (!readHeader(req, "x-store-id")) {
    return "X-Store-Id is required"
  }

  return null
}

export const validateCheckoutContactBody = (body: CartContactUpdateBody) => {
  const email = normalizeContactEmail(body.email)
  if (!email || !emailPattern.test(email)) {
    return "valid email is required"
  }

  return null
}

export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const headerError = validateCheckoutContactHeaders(req)
    if (headerError) {
      return res.status(401).json({
        error: { code: "CHECKOUT_HEADER_REQUIRED", message: headerError },
      })
    }

    const cartId = req.params.id as string
    const body = (req.body || {}) as CartContactUpdateBody
    const bodyError = validateCheckoutContactBody(body)

    if (bodyError) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: bodyError },
      })
    }

    const cartModule = req.scope.resolve(Modules.CART)
    const cart = await cartModule.retrieveCart(cartId, {
      relations: ["items", "shipping_address", "billing_address", "shipping_methods"],
    })
    assertCartBelongsToCurrentStore(req, cart)

    const email = normalizeContactEmail(body.email)
    const phone = typeof body.phone === "string" ? body.phone.trim() : undefined

    const contactMetadata = {
      ...(cart.metadata ?? {}),
      ...(phone ? { contact_phone: phone } : {}),
    }

    try {
      await updateCartWorkflow(req.scope).run({
        input: {
          id: cartId,
          email,
          metadata: contactMetadata,
        },
      })
    } catch (workflowError) {
      console.warn(
        "updateCartWorkflow failed while saving contact; falling back to cart service update:",
        readWorkflowErrorMessage(workflowError)
      )
      await cartModule.updateCarts(cartId, {
        email,
        metadata: contactMetadata,
      })
    }

    const cartAfter = await cartModule.retrieveCart(cartId, {
      relations: ["items", "shipping_address", "billing_address", "shipping_methods"],
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
    console.error("更新购物车联系信息失败:", error)
    res.status(400).json({ error: { code: "CART_CONTACT_UPDATE_ERROR", message } })
  }
}
