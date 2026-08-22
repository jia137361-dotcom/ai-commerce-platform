import type { ProductVariantRow } from "@ai-commerce/shared-types"

export type VariantLabelDimension = "color" | "size"

export type SupplierVariantLabelDefaults = Record<
  string,
  Partial<Pick<ProductVariantRow, "color" | "size">>
>

export function renameVariantLabel(
  variants: ProductVariantRow[],
  dimension: VariantLabelDimension,
  currentLabel: string,
  nextLabel: string
) {
  const trimmedLabel = nextLabel.trim()
  if (!trimmedLabel || trimmedLabel === currentLabel) return variants

  return variants.map((variant) =>
    variant[dimension] === currentLabel
      ? { ...variant, [dimension]: trimmedLabel }
      : variant
  )
}

export function resetVariantLabels(
  variants: ProductVariantRow[],
  defaults: SupplierVariantLabelDefaults,
  dimension: VariantLabelDimension
) {
  return variants.map((variant) => {
    const defaultValue =
      defaults[variant.supplier_variant_id] ??
      (variant.supplier_external_variant_id
        ? defaults[variant.supplier_external_variant_id]
        : undefined)
    const defaultLabel = defaultValue?.[dimension]
    if (typeof defaultLabel !== "string" || !defaultLabel.trim()) return variant
    return { ...variant, [dimension]: defaultLabel.trim() }
  })
}
