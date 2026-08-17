import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { listShippingOptionsForCartWorkflow } from "@medusajs/medusa/core-flows"
import {
  assertCartBelongsToCurrentStore,
  readCartStoreId,
} from "../../../../../lib/assert-cart-store"
import { CartStoreAccessError } from "../../../../../lib/cart-store-error"
import { readWorkflowErrorMessage } from "../../../../../lib/workflow-error"
import { syncCartLineItemShippingRequirements } from "../../../../../lib/sync-cart-line-item-shipping"
import {
  buildS2bShippingQuoteMetadata,
  quoteS2bShippingForCart,
} from "../../../../../lib/s2bdiy/quote-s2b-shipping-for-cart"
import { convertUsdPriceToMarketCurrency } from "../../../../../lib/product-regions"
import { majorToProviderMinor, normalizeMajor } from "../../../../../lib/money"

const medusaMajor = (value: number | null | undefined, currencyCode: string) =>
  value == null || !Number.isFinite(value) ? null : normalizeMajor(value, currencyCode)

type ShippingOptionResult = {
  id?: string
  name?: string
  amount?: number | null
  provider_id?: string | null
  service_zone_id?: string | null
  shipping_profile_id?: string | null
  data?: Record<string, unknown> | null
  calculated_price?: {
    calculated_amount?: number | null
  } | null
}

type CartForShippingOptions = {
  id?: string
  currency_code?: string
  metadata?: Record<string, unknown> | null
  items?: Array<{ requires_shipping?: boolean | null; quantity?: number | null }> | null
  shipping_address?: { id?: string | null; country_code?: string | null; province?: string | null; postal_code?: string | null } | null
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
    let cart = (await cartModule.retrieveCart(cart_id, {
      relations: ["items", "shipping_address"],
    })) as CartForShippingOptions
    assertCartBelongsToCurrentStore(req, cart)

    const synced = await syncCartLineItemShippingRequirements(req.scope, cart_id, cart.items)
    if (synced) {
      cart = (await cartModule.retrieveCart(cart_id, {
        relations: ["items", "shipping_address"],
      })) as CartForShippingOptions
    }

    const requiresShipping = Boolean(cart.items?.some((item) => item.requires_shipping))
    if (requiresShipping && !cart.shipping_address?.country_code) {
      return res.status(400).json({
        error: {
          code: "CART_SHIPPING_ADDRESS_REQUIRED",
          message: "Shipping address is required before loading shipping options.",
        },
      })
    }

    const { result } = await listShippingOptionsForCartWorkflow(req.scope).run({
      input: { cart_id },
    })

    const currency_code = cart.currency_code
    const s2bQuote = await quoteS2bShippingForCart(req.scope, cart_id)

    if (s2bQuote) {
      const existingMeta =
        cart.metadata && typeof cart.metadata === "object"
          ? (cart.metadata as Record<string, unknown>)
          : {}
      const address = cart.shipping_address as
        | { country_code?: string | null; province?: string | null; postal_code?: string | null }
        | null
        | undefined
      const quantity = (cart.items ?? []).reduce((sum, item) => {
        const qty = typeof item.quantity === "number" ? item.quantity : 1
        return sum + Math.max(1, qty)
      }, 0)
      await cartModule.updateCarts(cart_id, {
        metadata: {
          ...existingMeta,
          s2b_shipping_quote: buildS2bShippingQuoteMetadata(
            s2bQuote,
            {
              country: (address?.country_code ?? "").trim().toUpperCase(),
              province: address?.province ?? "",
              postcode: address?.postal_code ?? "",
            },
            Math.max(1, quantity)
          ),
        },
      })
    }

    const shipping_options = (result as ShippingOptionResult[]).map((option) => {
      const medusaAmount =
        option.amount ?? option.calculated_price?.calculated_amount ?? null
      const amountMajor = s2bQuote
        ? convertUsdPriceToMarketCurrency(s2bQuote.amountUsd, currency_code ?? "usd")
        : medusaMajor(typeof medusaAmount === "number" ? medusaAmount : null, currency_code ?? "usd")
      return {
        id: option.id,
        name: option.name,
        amount: amountMajor,
        amount_minor: amountMajor == null
          ? null
          : majorToProviderMinor(amountMajor, currency_code ?? "usd"),
        currency_code,
        provider_id: option.provider_id ?? null,
        service_zone_id: option.service_zone_id ?? null,
        shipping_profile_id: option.shipping_profile_id ?? null,
        data: {
          ...(option.data ?? {}),
          ...(s2bQuote
            ? {
                pricing_source: s2bQuote.source,
                s2b_amount_usd: s2bQuote.amountUsd,
                s2b_amount_cny: s2bQuote.amountCny,
                s2b_logistics_name: s2bQuote.logisticsName,
              }
            : {}),
        },
      }
    })

    if (process.env.NODE_ENV !== "production") {
      console.info("[cart-shipping-options] listed", {
        cart_id,
        requires_shipping: requiresShipping,
        option_count: shipping_options.length,
        returned_option_ids: shipping_options.map((option) => option.id).filter(Boolean),
        s2b_quote_amount_minor: s2bQuote?.amountMinor ?? null,
      })
    }

    res.status(200).json({
      cart_id: cart.id,
      store_id: readCartStoreId(cart),
      shipping_options,
      requires_shipping_method: requiresShipping,
      s2b_shipping_quote: s2bQuote
        ? {
            amount: s2bQuote.amountUsd,
            amount_minor: s2bQuote.amountMinor,
            amount_usd: s2bQuote.amountUsd,
            amount_cny: s2bQuote.amountCny,
            logistics_name: s2bQuote.logisticsName,
            source: s2bQuote.source,
          }
        : null,
    })
  } catch (error: unknown) {
    if (error instanceof CartStoreAccessError) {
      return res.status(403).json({
        error: { code: error.code, message: error.message },
      })
    }

    const message = readWorkflowErrorMessage(error)
    console.error("获取购物车配送选项失败:", error)
    res.status(500).json({ error: { code: "CART_SHIPPING_OPTIONS_ERROR", message } })
  }
}
