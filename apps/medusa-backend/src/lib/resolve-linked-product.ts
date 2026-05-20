/**
 * When multiple mc_products share the same medusa_variant_id (e.g. Phase1 bridge + AI draft),
 * prefer a published AI product (newest updated_at) for cart line-item production metadata.
 */
export function resolveLinkedProductForVariant(
  products: Record<string, unknown>[],
  options?: { storeId?: string }
): Record<string, unknown> | undefined {
  if (!products.length) {
    return undefined
  }

  let pool = products
  if (options?.storeId) {
    const inStore = pool.filter((p) => p.store_id === options.storeId)
    if (inStore.length) {
      pool = inStore
    }
  }

  const published = pool.filter((p) => p.status === "published")
  if (published.length) {
    pool = published
  }

  const aiProducts = pool.filter((p) => p.source === "ai")
  if (aiProducts.length) {
    pool = aiProducts
  }

  const sorted = [...pool].sort((a, b) => {
    const ta = Date.parse(String(a.updated_at ?? a.created_at ?? 0)) || 0
    const tb = Date.parse(String(b.updated_at ?? b.created_at ?? 0)) || 0
    return tb - ta
  })

  return sorted[0]
}
