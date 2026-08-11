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

type RegionCountry =
  | string
  | {
      iso_2?: string | null
      iso2?: string | null
      code?: string | null
      country_code?: string | null
    }

type CartForAddressUpdate = {
  id?: string
  email?: string | null
  sales_channel_id?: string | null
  region_id?: string | null
  region?: {
    id?: string | null
    countries?: RegionCountry[] | null
  } | null
}

type RegionModuleService = {
  retrieveRegion: (
    id: string,
    config?: { relations?: string[] }
  ) => Promise<{ id?: string; countries?: RegionCountry[] | null }>
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

const readCountryCode = (country: RegionCountry) => {
  if (typeof country === "string") return country.trim().toLowerCase()
  return (
    country.iso_2 ??
    country.iso2 ??
    country.code ??
    country.country_code ??
    ""
  )
    .trim()
    .toLowerCase()
}

const readRegionCountries = async (
  req: MedusaRequest,
  cart: CartForAddressUpdate
) => {
  const loadedCountries = cart.region?.countries
  if (loadedCountries?.length) {
    return loadedCountries.map(readCountryCode).filter(Boolean)
  }

  const regionId = cart.region_id ?? cart.region?.id
  if (!regionId) {
    return []
  }

  const regionModule = req.scope.resolve(Modules.REGION) as RegionModuleService
  const region = await regionModule.retrieveRegion(regionId, {
    relations: ["countries"],
  })
  return (region.countries ?? []).map(readCountryCode).filter(Boolean)
}

const validateCountryInRegion = async (
  req: MedusaRequest,
  cart: CartForAddressUpdate,
  countryCode: string
) => {
  const regionCountries = await readRegionCountries(req, cart)
  if (regionCountries.length && !regionCountries.includes(countryCode)) {
    return `country_code ${countryCode} is not supported by cart region`
  }
  return null
}

const isPricingRecalculationError = (error: unknown) => {
  const message = readWorkflowErrorMessage(error)
  return /calculated_amount|pricing|price recalculation|recalculation/i.test(message)
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

    const email = String(body.email).trim().toLowerCase()
    const phone = String(body.phone).trim()
    const countryCode = body.shipping_address!.country_code!.trim().toLowerCase()
    const countryError = await validateCountryInRegion(req, cart as CartForAddressUpdate, countryCode)
    if (countryError) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: countryError },
      })
    }

    const shippingAddress = {
      ...body.shipping_address,
      phone,
      country_code: countryCode,
    }

    const salesChannelId = cart.sales_channel_id
      ? undefined
      : await resolveDefaultSalesChannelId(req.scope)

    const workflowPayload = {
      email,
      ...(salesChannelId ? { sales_channel_id: salesChannelId } : {}),
      shipping_address: shippingAddress,
    }
    const fallbackPayload = {
      email,
      ...(salesChannelId ? { sales_channel_id: salesChannelId } : {}),
      shipping_address: { ...shippingAddress },
    }

    try {
      await updateCartWorkflow(req.scope).run({
        input: {
          id: cart_id,
          ...workflowPayload,
        },
      })
    } catch (workflowError) {
      if (!isPricingRecalculationError(workflowError)) {
        throw workflowError
      }

      console.warn(
        "updateCartWorkflow failed while saving address; falling back to cart service update:",
        readWorkflowErrorMessage(workflowError)
      )
      await cartModule.updateCarts(cart_id, fallbackPayload)
    }

    const cartAfter = await cartModule.retrieveCart(cart_id, {
      relations: ["items", "shipping_address", "billing_address", "shipping_methods"],
    })

    if (process.env.NODE_ENV !== "production") {
      const cartForLog = cart as CartForAddressUpdate
      console.info("[cart-address] saved", {
        cart_id,
        region_id: cartForLog.region_id ?? cartForLog.region?.id ?? null,
        sales_channel_id: cartForLog.sales_channel_id ?? salesChannelId ?? null,
        country_code: countryCode,
        address_saved: Boolean(cartAfter.shipping_address),
      })
    }

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
    res.status(500).json({ error: { code: "CART_ADDRESS_UPDATE_ERROR", message } })
  }
}
