import type { BuyerStoreSettings } from "./buyer-api"
import type { StoreProduct } from "./mock-data"

export const buildStoreHref = (options?: {
  storeId?: string | null
  storeSlug?: string | null
}) => {
  const slug = options?.storeSlug?.trim()
  if (slug) return `/shops/${encodeURIComponent(slug)}`
  const storeId = options?.storeId?.trim()
  return storeId ? `/store?store_id=${encodeURIComponent(storeId)}` : "/marketplace"
}

export const buildSettingsStoreHref = (settings: BuyerStoreSettings) =>
  buildStoreHref({ storeId: settings.storeId })

export const buildProductStoreHref = (product: StoreProduct | null | undefined, settings: BuyerStoreSettings) =>
  buildStoreHref({
    storeId: product?.storeId ?? settings.storeId,
    storeSlug: product?.storeSlug,
  })

export const buildProductDetailHref = (product: StoreProduct) => {
  const params = new URLSearchParams()
  if (product.storeId) params.set("store", product.storeId)
  const query = params.toString()
  return `/products/${encodeURIComponent(product.id)}${query ? `?${query}` : ""}`
}
