import type { BuyerStoreSettings } from "./buyer-api"
import type { StoreProduct } from "./mock-data"

const MARKETPLACE_STORE_ID = "marketplace"
const ACTIVE_STORE_STORAGE_KEY = "citigoo:active_store_id"

const isMarketplaceStoreId = (storeId: string) => storeId === MARKETPLACE_STORE_ID

const readPersistedStoreId = () => {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage.getItem(ACTIVE_STORE_STORAGE_KEY)?.trim() || null
  } catch {
    return null
  }
}

const readDefaultStoreId = () => "default_store"

/** Resolve a real seller store id for APIs that cannot use marketplace. */
export const resolveMessageStoreId = (storeId?: string | null) => {
  const normalized = storeId?.trim() || ""
  if (normalized && !isMarketplaceStoreId(normalized)) return normalized
  const persisted = readPersistedStoreId()
  if (persisted && !isMarketplaceStoreId(persisted)) return persisted
  return readDefaultStoreId()
}

export const buildStoreHref = (options?: {
  storeId?: string | null
  storeSlug?: string | null
}) => {
  const slug = options?.storeSlug?.trim()
  if (slug) return `/shops/${encodeURIComponent(slug)}`
  const storeId = options?.storeId?.trim()
  if (storeId && isMarketplaceStoreId(storeId)) return "/marketplace"
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
  if (product.storeId && !isMarketplaceStoreId(product.storeId)) {
    params.set("store", product.storeId)
  }
  const query = params.toString()
  return `/products/${encodeURIComponent(product.id)}${query ? `?${query}` : ""}`
}

export const buildStoreMessagesHref = (storeId?: string | null, orderId?: string | null) => {
  const params = new URLSearchParams()
  const normalizedStoreId = resolveMessageStoreId(storeId)
  const normalizedOrderId = orderId?.trim()
  if (normalizedStoreId) params.set("store_id", normalizedStoreId)
  if (normalizedOrderId) params.set("orderId", normalizedOrderId)
  const query = params.toString()
  return `/account/messages${query ? `?${query}` : ""}`
}
