import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { updateCartWorkflow } from "@medusajs/medusa/core-flows"
import {
  assertCartBelongsToCurrentStore,
  readCartStoreId,
} from "../../../../../lib/assert-cart-store"
import { CartStoreAccessError } from "../../../../../lib/cart-store-error"
import { readWorkflowErrorMessage } from "../../../../../lib/workflow-error"
import { resolveDefaultSalesChannelId } from "../../../../../lib/resolve-default-sales-channel"

type CartAddressUpdateBody = {
  email?: string
  phone?: string
  shipping_address?: {
    first_name?: string
    last_name?: string
    address_1?: string
    address_2?: string
    city?: string
    province?: string
    postal_code?: string
    country_code?: string
  }
}

const requiredAddressFields: Array<keyof NonNullable<CartAddressUpdateBody["shipping_address"]>> = [
  "first_name",
  "last_name",
  "address_1",
  "city",
  "postal_code",
  "country_code",
]

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

const validateBody = (body: CartAddressUpdateBody) => {
  if (!body.email || !body.email.includes("@")) {
    return "email is required"
  }

  if (!body.phone) {
    return "phone is required"
  }

  if (!body.shipping_address) {
    return "shipping_address is required"
  }

  for (const field of requiredAddressFields) {
    if (!body.shipping_address[field]) {
      return `shipping_address.${field} is required`
    }
  }

  return null
}

export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const headerError = validateCheckoutBridgeHeaders(req)
    if (headerError) {
      return res.status(401).json({
        error: { code: "CHECKOUT_HEADER_REQUIRED", message: headerError },
      })
    }

    const cart_id = req.params.id as string
    const body = (req.body || {}) as CartAddressUpdateBody
    const bodyError = validateBody(body)

    if (bodyError) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: bodyError },
      })
    }

    const cartModule = req.scope.resolve(Modules.CART)
    const cart = await cartModule.retrieveCart(cart_id, {
      relations: ["items", "shipping_address", "billing_address"],
    })
    assertCartBelongsToCurrentStore(req, cart)

    const shippingAddress = {
      ...body.shipping_address,
      phone: body.phone,
      country_code: body.shipping_address!.country_code!.toLowerCase(),
    }

    const salesChannelId = cart.sales_channel_id
      ? undefined
      : await resolveDefaultSalesChannelId(req.scope)

    await updateCartWorkflow(req.scope).run({
      input: {
        id: cart_id,
        email: body.email,
        ...(salesChannelId ? { sales_channel_id: salesChannelId } : {}),
        shipping_address: shippingAddress,
        billing_address: shippingAddress,
      },
    })

    if (salesChannelId) {
      await cartModule.updateCarts(cart_id, {
        sales_channel_id: salesChannelId,
      })
    }

    await cartModule.updateCarts(cart_id, {
      ...(salesChannelId ? { sales_channel_id: salesChannelId } : {}),
      email: body.email,
    })

    const cartAfter = await cartModule.retrieveCart(cart_id, {
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
    console.error("更新购物车地址失败:", error)
    res.status(400).json({ error: { code: "CART_ADDRESS_UPDATE_ERROR", message } })
  }
}
