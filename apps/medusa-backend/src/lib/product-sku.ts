export type ProductSku = {
  supplier_variant_id: string
  medusa_variant_id?: string | null
  sku?: string | null
  color?: string | null
  size?: string | null
  price?: number | null
  cost?: number | null
  price_override?: number | null
  enabled?: boolean
  [key: string]: unknown
}

export type ProductSkuUpdate = {
  supplier_variant_id: string
  price_override?: number | null
  enabled?: boolean
}

export const normalizeProductSkus = (variants: unknown): ProductSku[] =>
  Array.isArray(variants)
    ? variants.filter((variant): variant is ProductSku => Boolean(variant && typeof variant === "object" && typeof (variant as ProductSku).supplier_variant_id === "string"))
    : []

export const applySkuUpdates = (variants: unknown, updates: ProductSkuUpdate[]): ProductSku[] => {
  const bySupplierVariantId = new Map(updates.map((update) => [update.supplier_variant_id, update]))
  return normalizeProductSkus(variants).map((variant) => {
    const update = bySupplierVariantId.get(variant.supplier_variant_id)
    const hasPriceOverride = Boolean(update) && Object.prototype.hasOwnProperty.call(update, "price_override")
    return {
      ...variant,
      price_override: hasPriceOverride ? update?.price_override ?? null : variant.price_override ?? null,
      enabled: update?.enabled ?? variant.enabled ?? true,
    }
  })
}

export const isSkuPurchasable = (variants: unknown, medusaVariantId: string) => {
  const variant = normalizeProductSkus(variants).find((entry) => entry.medusa_variant_id === medusaVariantId)
  return variant ? variant.enabled !== false : true
}

export const readSkuPrice = (variant: ProductSku, defaultPrice: number | null | undefined) =>
  typeof variant.price_override === "number" && Number.isFinite(variant.price_override)
    ? variant.price_override
    : (typeof variant.price === "number" && Number.isFinite(variant.price) ? variant.price : defaultPrice)
