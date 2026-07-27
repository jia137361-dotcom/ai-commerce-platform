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
  quotedAt?: string
}

const DEFAULT_QUOTE_TIMEOUT_MS = 12_000
const DEFAULT_QUOTE_TTL_MS = 10 * 60 * 1000

function resolveNonNegativeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed >= 0) return parsed
  }
  return null
}

function readQuoteTimeoutMs() {
  const raw = Number(process.env.S2BDIY_LOGISTICS_TIMEOUT_MS ?? DEFAULT_QUOTE_TIMEOUT_MS)
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_QUOTE_TIMEOUT_MS
}

function readQuoteTtlMs() {
  const raw = Number(process.env.S2BDIY_SHIPPING_QUOTE_TTL_MS ?? DEFAULT_QUOTE_TTL_MS)
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_QUOTE_TTL_MS
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

function readCachedQuote(
  metadata: Record<string, unknown> | null | undefined,
  expected: {
    country: string
    province: string
    postcode: string
    basicProductId: string
    quantity: number
  }
): S2bCartShippingQuote | null {
  const raw = metadata?.s2b_shipping_quote
  if (!raw || typeof raw !== "object") return null
  const quote = raw as Record<string, unknown>
  const quotedAt = typeof quote.quoted_at === "string" ? Date.parse(quote.quoted_at) : NaN
  if (!Number.isFinite(quotedAt) || Date.now() - quotedAt > readQuoteTtlMs()) return null

  const country = readString(quote.country)?.toUpperCase()
  const province = readString(quote.province) ?? ""
  const postcode = readString(quote.postcode) ?? ""
  const basicProductId = readString(quote.basic_product_id)
  const quantity = resolveNonNegativeNumber(quote.quantity)
  if (
    country !== expected.country ||
    province !== expected.province ||
    postcode !== expected.postcode ||
    basicProductId !== expected.basicProductId ||
    quantity !== expected.quantity
  ) {
    return null
  }

  const amountUsd = resolveNonNegativeNumber(quote.amount_usd)
  const amountMinor =
    resolveNonNegativeNumber(quote.amount_minor) ??
    (amountUsd != null ? Math.round(amountUsd * 100) : null)
  const amountCny = resolveNonNegativeNumber(quote.amount_cny)
  if (amountUsd == null || amountMinor == null || amountCny == null || !basicProductId) {
    return null
  }

  return {
    amountMinor,
    amountUsd,
    amountCny,
    logisticsPlatformId:
      quote.logistics_platform_id != null ? String(quote.logistics_platform_id) : null,
    logisticsName: typeof quote.logistics_name === "string" ? quote.logistics_name : null,
    basicProductId,
    currencyCode: "usd",
    source: "s2bdiy_logisticsCalculation",
    quotedAt: quote.quoted_at as string,
  }
}

export function buildS2bShippingQuoteMetadata(
  quote: S2bCartShippingQuote,
  address: { country: string; province: string; postcode: string },
  quantity: number
) {
  return {
    amount_minor: quote.amountMinor,
    amount_usd: quote.amountUsd,
    amount_cny: quote.amountCny,
    logistics_platform_id: quote.logisticsPlatformId,
    logistics_name: quote.logisticsName,
    basic_product_id: quote.basicProductId,
    source: quote.source,
    country: address.country,
    province: address.province,
    postcode: address.postcode,
    quantity,
    quoted_at: quote.quotedAt ?? new Date().toISOString(),
  }
}

export async function quoteS2bShippingForCart(
  container: MedusaContainer,
  cartId: string,
  options?: { forceRefresh?: boolean }
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
  const province = address?.province ?? ""
  const postcode = address?.postal_code ?? ""
  const expected = {
    country,
    province,
    postcode,
    basicProductId,
    quantity: Math.max(1, quantity),
  }

  if (!options?.forceRefresh) {
    const cached = readCachedQuote(
      cart.metadata && typeof cart.metadata === "object"
        ? (cart.metadata as Record<string, unknown>)
        : null,
      expected
    )
    if (cached) return cached
  }

  const weight = Number(process.env.S2BDIY_DEFAULT_WEIGHT ?? 0.3)
  const length = Number(process.env.S2BDIY_DEFAULT_LENGTH ?? 30)
  const width = Number(process.env.S2BDIY_DEFAULT_WIDTH ?? 25)
  const height = Number(process.env.S2BDIY_DEFAULT_HEIGHT ?? 2)

  try {
    const client = new S2bdiyClient(s2bConfig)
    const logisticsOptions = await calculateLogisticsClient(
      client,
      {
        basic_product_id: basicProductId,
        platform: s2bConfig.platformId,
        num: Math.max(1, quantity),
        country,
        province,
        postcode,
        weight,
        length,
        width,
        height,
      },
      { timeoutMs: readQuoteTimeoutMs() }
    )
    const picked = pickLogisticsOption(logisticsOptions, true)
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
      quotedAt: new Date().toISOString(),
    }
  } catch (error) {
    console.warn(
      "[s2b-shipping-quote] logisticsCalculation failed",
      error instanceof Error ? error.message : error
    )
    return null
  }
}
