/** Dev1 field names on mc_product; read top-level first, then metadata until Dev1 migration lands. */

export function readMcProductSupplierField(
  product: Record<string, unknown>,
  key: string
): unknown {
  if (product[key] !== undefined && product[key] !== null) {
    return product[key]
  }
  const meta = product.metadata as Record<string, unknown> | null | undefined
  return meta?.[key]
}

/** S2B quickCreate product_id (Dev1: metadata.supplier_product_id; top-level supplier_product_id is catalog sp_*). */
export function readDesignedSupplierProductId(
  product: Record<string, unknown>
): string | null {
  const meta = product.metadata as Record<string, unknown> | null | undefined
  const fromMeta = meta?.supplier_product_id
  if (typeof fromMeta === "string" && fromMeta.length > 0 && !fromMeta.startsWith("sp_")) {
    return fromMeta
  }
  const top = product.supplier_product_id
  if (typeof top === "string" && top.length > 0 && !top.startsWith("sp_") && !top.startsWith("spv_")) {
    return top
  }
  return null
}

export function mergeMcProductSupplierMetadata(
  product: Record<string, unknown>,
  fields: Record<string, unknown>
): Record<string, unknown> {
  const existing =
    product.metadata && typeof product.metadata === "object"
      ? (product.metadata as Record<string, unknown>)
      : {}
  return { ...existing, ...fields }
}
