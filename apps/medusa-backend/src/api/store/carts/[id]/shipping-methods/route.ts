import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { addShippingMethodToCartWorkflow } from "@medusajs/medusa/core-flows"
import {
  assertCartBelongsToCurrentStore,
  readCartStoreId,
} from "../../../../../lib/assert-cart-store"
import { CartStoreAccessError } from "../../../../../lib/cart-store-error"
import { readWorkflowErrorMessage } from "../../../../../lib/workflow-error"
import {
  buildS2bShippingQuoteMetadata,
  quoteS2bShippingForCart,
} from "../../../../../lib/s2bdiy/quote-s2b-shipping-for-cart"
import { convertUsdPriceToMarketCurrency } from "../../../../../lib/product-regions"

type ShippingMethodBody = {
  option_id?: string
}

type CartShippingMethodRow = {
  id?: string | null
  shipping_option_id?: string | null
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

const isMissingShippingMethodError = (error: unknown) =>
  /ShippingMethod with id .+ not found/i.test(
    error instanceof Error ? error.message : String(error ?? "")
  )

const findShippingMethodForOption = (
  methods: CartShippingMethodRow[] | null | undefined,
  optionId: string
) =>
  methods?.find((method) => String(method.shipping_option_id ?? "") === optionId) ??
  methods?.[0] ??
  null

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
    const optionId = body.option_id?.trim()

    if (!optionId) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "option_id is required" },
      })
    }

    const cartModule = req.scope.resolve(Modules.CART)
    const cart = await cartModule.retrieveCart(cart_id, {
      relations: ["items", "shipping_address", "shipping_methods"],
    })
    assertCartBelongsToCurrentStore(req, cart)

    // Clear existing methods first so Medusa's remove+add race cannot leave a
    // stale casm_* id for a concurrent select / S2B amount update.
    const existingMethodIds = ((cart.shipping_methods ?? []) as CartShippingMethodRow[])
      .map((method) => String(method.id ?? "").trim())
      .filter(Boolean)
    if (existingMethodIds.length) {
      await cartModule.softDeleteShippingMethods(existingMethodIds)
    }

    await addShippingMethodToCartWorkflow(req.scope).run({
      input: {
        cart_id,
        options: [{ id: optionId }],
      },
    })

    let cartAfter = await cartModule.retrieveCart(cart_id, {
      relations: ["items", "shipping_address", "shipping_methods"],
    })

    const s2bQuote = await quoteS2bShippingForCart(req.scope, cart_id)
    if (s2bQuote) {
      const applyS2bAmount = async () => {
        const fresh = await cartModule.retrieveCart(cart_id, {
          relations: ["items", "shipping_address", "shipping_methods"],
        })
        const method = findShippingMethodForOption(
          fresh.shipping_methods as CartShippingMethodRow[] | null | undefined,
          optionId
        )
        const shippingMethodId = String(method?.id ?? "").trim()
        if (!shippingMethodId) return fresh

        // Cart module only accepts UpdateShippingMethodDTO[] (not id + data overload).
        const cartCurrencyCode = typeof fresh.currency_code === "string" ? fresh.currency_code : "usd"
        const localizedAmount = convertUsdPriceToMarketCurrency(s2bQuote.amountUsd, cartCurrencyCode)
        await cartModule.updateShippingMethods([
          {
            id: shippingMethodId,
            amount: Math.round(localizedAmount * 100),
            data: {
              pricing_source: s2bQuote.source,
              s2b_amount_usd: s2bQuote.amountUsd,
              s2b_amount_cny: s2bQuote.amountCny,
              s2b_logistics_name: s2bQuote.logisticsName,
              s2b_logistics_platform_id: s2bQuote.logisticsPlatformId,
            },
          },
        ])

        const existingMeta =
          fresh.metadata && typeof fresh.metadata === "object"
            ? (fresh.metadata as Record<string, unknown>)
            : {}
        const address = fresh.shipping_address as
          | { country_code?: string | null; province?: string | null; postal_code?: string | null }
          | null
          | undefined
        const quantity = ((fresh.items ?? []) as Array<{ quantity?: number }>).reduce(
          (sum, item) => {
            const qty = typeof item.quantity === "number" ? item.quantity : 1
            return sum + Math.max(1, qty)
          },
          0
        )
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

        return cartModule.retrieveCart(cart_id, {
          relations: ["items", "shipping_address", "shipping_methods"],
        })
      }

      try {
        cartAfter = await applyS2bAmount()
      } catch (updateError) {
        if (!isMissingShippingMethodError(updateError)) throw updateError
        // Concurrent select may have replaced the method; retry once against the latest row.
        console.warn(
          "[cart-shipping-method] S2B amount update hit missing method; retrying once:",
          updateError instanceof Error ? updateError.message : updateError
        )
        try {
          cartAfter = await applyS2bAmount()
        } catch (retryError) {
          if (!isMissingShippingMethodError(retryError)) throw retryError
          // Shipping option is already on the cart; keep selection successful.
          console.warn(
            "[cart-shipping-method] S2B amount update skipped after retry:",
            retryError instanceof Error ? retryError.message : retryError
          )
          cartAfter = await cartModule.retrieveCart(cart_id, {
            relations: ["items", "shipping_address", "shipping_methods"],
          })
        }
      }
    }

    if (process.env.NODE_ENV !== "production") {
      console.info("[cart-shipping-method] selected", {
        cart_id,
        selected_option_id: optionId,
        shipping_method_id:
          findShippingMethodForOption(
            cartAfter.shipping_methods as CartShippingMethodRow[] | null | undefined,
            optionId
          )?.id ?? null,
        s2b_quote_amount_minor: s2bQuote?.amountMinor ?? null,
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
    console.error("选择购物车配送方式失败:", error)
    res.status(400).json({ error: { code: "CART_SHIPPING_METHOD_ERROR", message } })
  }
}
