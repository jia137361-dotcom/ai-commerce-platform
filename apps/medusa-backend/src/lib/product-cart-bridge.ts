export type StoreCoreProductLike = {
  id?: unknown
  store_id?: unknown
  status?: unknown
  medusa_variant_id?: unknown
  metadata?: unknown
}

export type NativeBridgeMetadata = {
  store_id: string
  mc_product_id: string
  source: "store-core"
}

export function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

export function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {}
}

export function isSharedSkuProduct(product: StoreCoreProductLike): boolean {
  return readRecord(product.metadata).shared_sku === true
}

export function buildNativeBridgeMetadata(
  productId: string,
  storeId: string
): NativeBridgeMetadata {
  return {
    store_id: storeId,
    mc_product_id: productId,
    source: "store-core",
  }
}

export function findMedusaVariantReuseConflict(
  linkedProducts: StoreCoreProductLike[],
  productId: string
): StoreCoreProductLike | undefined {
  return linkedProducts.find((linked) => readString(linked.id) !== productId)
}

export function hasDedicatedNativeBridge(
  nativeVariant: Record<string, unknown>,
  nativeProduct: Record<string, unknown> | undefined,
  productId: string,
  storeId: string
): boolean {
  const variantMetadata = readRecord(nativeVariant.metadata)
  const productMetadata = readRecord(nativeProduct?.metadata)

  return (
    readString(variantMetadata.store_id) === storeId &&
    readString(productMetadata.store_id) === storeId &&
    readString(variantMetadata.mc_product_id) === productId &&
    readString(productMetadata.mc_product_id) === productId &&
    readString(variantMetadata.source) === "store-core" &&
    readString(productMetadata.source) === "store-core"
  )
}

export function findPublishedVariantDuplicates(
  products: StoreCoreProductLike[]
): Array<{ store_id: string; medusa_variant_id: string; product_ids: string[] }> {
  const groups = new Map<string, { store_id: string; medusa_variant_id: string; product_ids: string[] }>()

  for (const product of products) {
    if (product.status !== "published") continue

    const storeId = readString(product.store_id)
    const variantId = readString(product.medusa_variant_id)
    const productId = readString(product.id)
    if (!storeId || !variantId || !productId) continue

    const key = `${storeId}:${variantId}`
    const group = groups.get(key) ?? {
      store_id: storeId,
      medusa_variant_id: variantId,
      product_ids: [],
    }
    group.product_ids.push(productId)
    groups.set(key, group)
  }

  return [...groups.values()].filter((group) => group.product_ids.length > 1)
}
