import { readString } from "./product-cart-bridge"

export type StoreCoreVariantRow = {
  supplier_variant_id: string
  medusa_variant_id?: string
  supplier_size_id?: string
  supplier_color_id?: string
  color: string
  size: string
  price: number
  stock: number
}

export function readStoreCoreVariantRows(
  product: Record<string, unknown>,
  fallbackPrice: number
): StoreCoreVariantRow[] {
  if (!Array.isArray(product.variants)) return []

  const seen = new Set<string>()
  return product.variants.flatMap((value) => {
    if (!value || typeof value !== "object") return []
    const row = value as Record<string, unknown>
    const supplierVariantId = readString(row.supplier_variant_id)
    if (!supplierVariantId || seen.has(supplierVariantId)) return []
    seen.add(supplierVariantId)

    const rawPrice = Number(row.price)
    const rawStock = Number(row.stock)
    return [{
      supplier_variant_id: supplierVariantId,
      medusa_variant_id: readString(row.medusa_variant_id) ?? undefined,
      supplier_size_id: readString(row.supplier_size_id) ?? undefined,
      supplier_color_id: readString(row.supplier_color_id) ?? undefined,
      color: readString(row.color) ?? "Default",
      size: readString(row.size) ?? "Default",
      price: Number.isFinite(rawPrice) && rawPrice > 0 ? rawPrice : fallbackPrice,
      stock: Number.isFinite(rawStock) && rawStock >= 0 ? rawStock : 0,
    }]
  })
}

export function findStoreCoreVariantRow(
  product: Record<string, unknown>,
  medusaVariantId: string
) {
  return readStoreCoreVariantRows(product, 0).find(
    (row) => row.medusa_variant_id === medusaVariantId
  )
}
