type SupplierVariant = {
  supplier_variant_id: string
  color?: string | null
  size?: string | null
  color_name?: string | null
  size_name?: string | null
}

export type SupplierProductRow = {
  supplier_product_id: string
  supplier_id?: string | null
  name: string
  platform_product_id?: string | null
  basic_product_id?: string | null
  base_cost?: number | null
  variants: SupplierVariant[]
}

const isWhiteVariant = (variant: SupplierVariant) => {
  const label = `${variant.color_name ?? ""} ${variant.color ?? ""}`.toLowerCase()
  return /\bwhite\b/.test(label) || label.includes("白")
}

const variantSizeRank = (variant: SupplierVariant) => {
  const size = (variant.size_name ?? variant.size ?? "").toLowerCase()
  if (size === "m" || size.includes("medium")) return 0
  if (size === "s" || size.includes("small")) return 1
  if (size === "l" || size.includes("large")) return 2
  return 3
}

export const pickPreferredWhiteTee = (products: SupplierProductRow[]) => {
  if (!products.length) return null

  const ranked = [...products].sort((a, b) => {
    const aS2b = a.basic_product_id ? 0 : 1
    const bS2b = b.basic_product_id ? 0 : 1
    if (aS2b !== bS2b) return aS2b - bS2b

    const aTee = /t-?shirt|tee|t恤/i.test(a.name) ? 0 : 1
    const bTee = /t-?shirt|tee|t恤/i.test(b.name) ? 0 : 1
    if (aTee !== bTee) return aTee - bTee

    return a.name.localeCompare(b.name)
  })

  const product = ranked[0]
  const variants = product.variants ?? []
  if (!variants.length) return { product, variant: null }

  const whiteVariants = variants.filter(isWhiteVariant)
  const pool = whiteVariants.length ? whiteVariants : variants
  const variant = [...pool].sort((a, b) => variantSizeRank(a) - variantSizeRank(b))[0]

  return { product, variant }
}

export const formatSupplierVariantLabel = (variant: SupplierVariant) => {
  const color = variant.color_name ?? variant.color ?? "Default"
  const size = variant.size_name ?? variant.size ?? "One size"
  return `${color} / ${size}`
}
