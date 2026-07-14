/**
 * Quote S2BDIY logistics for a cart destination and convert to USD minor units.
 */

import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { STORE_CORE_MODULE } from "../../modules/store-core"
import type StoreCoreModuleService from "../../modules/store-core/service"
import { getS2bdiyConfig } from "../../modules/suppliers/s2bdiy/config"
import { S2bdiyClient } from "../../modules/suppliers/s2bdiy/s2bdiy-client"
import {
  calculateLogisticsClient,
  pickLogisticsOption,
} from "../../modules/suppliers/s2bdiy/s2bdiy-logistics"
import { convertShippingCnyToUsdWithMargin } from "../pricing"
import { readString } from "../product-cart-bridge"

export type S2bCartShippingQuote = {
  amountMinor: number
  amountUsd: number
  amountCny: number
  logisticsPlatformId: string | null
  logisticsName: string | null
  basicProductId: string
  currencyCode: "usd"
  source: "s2bdiy_logisticsCalculation"
}

function resolveNonNegativeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed >= 0) return parsed
  }
  return null
}

async function resolveBasicProductIdForCart(
  storeCore: StoreCoreModuleService,
  cart: {
    items?: Array<{
      variant_id?: string | null
      metadata?: Record<string, unknown> | null
    }> | null
  }
): Promise<string | null> {
  for (const item of cart.items ?? []) {
    const fromMeta =
      readString(item.metadata?.basic_product_id) ||
      readString(item.metadata?.basicProductId)
    if (fromMeta) return fromMeta

    const mcProductId = readString(item.metadata?.mc_product_id)
    if (mcProductId) {
      const rows = await storeCore.listProducts({ id: mcProductId }, { take: 1 })
      const product = Array.isArray(rows) ? rows[0] : null
      const basic = readString(product?.basic_product_id)
      if (basic) return basic
    }

    const variantId = readString(item.variant_id)
    if (!variantId) continue
    const linked = await storeCore.listProducts({ medusa_variant_id: variantId }, { take: 5 })
    for (const product of Array.isArray(linked) ? linked : []) {
      const basic = readString(product.basic_product_id)
      if (basic) return basic
      const metaBasic = readString(
        (product.metadata as Record<string, unknown> | undefined)?.basic_product_id
      )
      if (metaBasic) return metaBasic
    }
  }
  return null
}

export async function quoteS2bShippingForCart(
  container: MedusaContainer,
  cartId: string
): Promise<S2bCartShippingQuote | null> {
  const s2bConfig = getS2bdiyConfig()
  if (!s2bConfig) return null

  const cartModule = container.resolve(Modules.CART)
  const storeCore = container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService
  const cart = await cartModule.retrieveCart(cartId, {
    relations: ["items", "shipping_address"],
  })

  const address = cart.shipping_address as
    | {
        country_code?: string | null
        province?: string | null
        postal_code?: string | null
      }
    | null
    | undefined
  const country = address?.country_code?.trim().toUpperCase()
  if (!country) return null

  const basicProductId = await resolveBasicProductIdForCart(storeCore, cart)
  if (!basicProductId) return null

  const quantity = (cart.items ?? []).reduce((sum, item) => {
    const qty = typeof item.quantity === "number" ? item.quantity : 1
    return sum + Math.max(1, qty)
  }, 0)

  const weight = Number(process.env.S2BDIY_DEFAULT_WEIGHT ?? 0.3)
  const length = Number(process.env.S2BDIY_DEFAULT_LENGTH ?? 30)
  const width = Number(process.env.S2BDIY_DEFAULT_WIDTH ?? 25)
  const height = Number(process.env.S2BDIY_DEFAULT_HEIGHT ?? 2)

  try {
    const client = new S2bdiyClient(s2bConfig)
    const options = await calculateLogisticsClient(client, {
      basic_product_id: basicProductId,
      platform: s2bConfig.platformId,
      num: Math.max(1, quantity),
      country,
      province: address?.province ?? "",
      postcode: address?.postal_code ?? "",
      weight,
      length,
      width,
      height,
    })
    const picked = pickLogisticsOption(options, true)
    if (!picked) return null
    const cny = resolveNonNegativeNumber(picked.amount)
    if (cny === null) return null
    const amountUsd = convertShippingCnyToUsdWithMargin(cny)
    return {
      amountMinor: Math.round(amountUsd * 100),
      amountUsd,
      amountCny: cny,
      logisticsPlatformId:
        picked?.logistics_platform_id != null ? String(picked.logistics_platform_id) : null,
      logisticsName: typeof picked?.name === "string" ? picked.name : null,
      basicProductId,
      currencyCode: "usd",
      source: "s2bdiy_logisticsCalculation",
    }
  } catch (error) {
    console.warn(
      "[s2b-shipping-quote] logisticsCalculation failed",
      error instanceof Error ? error.message : error
    )
    return null
  }
}
