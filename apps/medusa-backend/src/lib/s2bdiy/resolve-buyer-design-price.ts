/**
 * Resolve buyer-design retail USD from S2B basic product purchase price (CNY).
 */

import type { S2bdiyClient } from "../../modules/suppliers/s2bdiy/s2bdiy-client"
import { getBasicProductDetail } from "../../modules/suppliers/s2bdiy/s2bdiy-product"
import { calculateRetailPriceUsd, convertCnyToUsd } from "../pricing"

function resolveNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return null
}

export type BuyerDesignS2bCost = {
  purchasePriceCny: number
  retailPriceUsd: number
  costUsd: number
  source: "item" | "basic" | "none"
}

export async function resolveBuyerDesignPriceFromS2b(
  client: S2bdiyClient,
  input: {
    basicProductId: string | number
    sizeId?: number | string | null
    colorId?: number | string | null
  }
): Promise<BuyerDesignS2bCost | null> {
  try {
    const detail = await getBasicProductDetail(client, input.basicProductId)
    const sizeId = resolveNumber(input.sizeId)
    const colorId = resolveNumber(input.colorId)
    const items = Array.isArray(detail.items) ? detail.items : []

    let purchasePriceCny: number | null = null
    let source: BuyerDesignS2bCost["source"] = "none"

    for (const row of items) {
      if (!row || typeof row !== "object") continue
      const item = row as Record<string, unknown>
      const itemSize = resolveNumber(item.size_id)
      const itemColor = resolveNumber(item.color_id)
      if (sizeId && colorId && itemSize === sizeId && itemColor === colorId) {
        purchasePriceCny = resolveNumber(item.price)
        if (purchasePriceCny) {
          source = "item"
          break
        }
      }
    }

    if (!purchasePriceCny) {
      for (const row of items) {
        if (!row || typeof row !== "object") continue
        const item = row as Record<string, unknown>
        const price = resolveNumber(item.price)
        if (price) {
          purchasePriceCny = price
          source = "item"
          break
        }
      }
    }

    if (!purchasePriceCny) {
      purchasePriceCny = resolveNumber(detail.purchase_price)
      if (purchasePriceCny) source = "basic"
    }

    if (!purchasePriceCny) return null

    return {
      purchasePriceCny,
      retailPriceUsd: calculateRetailPriceUsd(purchasePriceCny),
      costUsd: convertCnyToUsd(purchasePriceCny),
      source,
    }
  } catch (error) {
    console.warn(
      "[buyer-design-price] unable to resolve S2B basic product price",
      error instanceof Error ? error.message : error
    )
    return null
  }
}
