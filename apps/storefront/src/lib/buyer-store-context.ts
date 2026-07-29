const readEnv = (key: string, fallback = "") =>
  (import.meta.env[key] as string | undefined)?.trim() || fallback

export const MARKETPLACE_STORE_ID = "marketplace"
export const ACTIVE_STORE_STORAGE_KEY = "citigoo:active_store_id"

const legacyDefaultStoreId = readEnv(
  "VITE_DEFAULT_STORE_ID",
  readEnv("NEXT_PUBLIC_STORE_ID", "default_store")
)

let runtimeStoreId: string | null = null

const readPersistedStoreId = (): string | null => {
  if (typeof window === "undefined") return null
  try {
    const value = window.localStorage.getItem(ACTIVE_STORE_STORAGE_KEY)?.trim()
    return value || null
  } catch {
    return null
  }
}

const persistStoreId = (storeId: string | null) => {
  if (typeof window === "undefined") return
  try {
    if (storeId) {
      window.localStorage.setItem(ACTIVE_STORE_STORAGE_KEY, storeId)
    } else {
      window.localStorage.removeItem(ACTIVE_STORE_STORAGE_KEY)
    }
  } catch {
    // Ignore storage failures in private browsing.
  }
}

export const isMarketplaceStoreId = (storeId: string) => storeId === MARKETPLACE_STORE_ID

/** Restore the last visited store from localStorage on cold start. */
export const hydrateBuyerStoreContext = () => {
  runtimeStoreId = readPersistedStoreId()
}

export const setActiveBuyerStoreId = (storeId: string | null) => {
  const normalized = storeId?.trim() || null
  runtimeStoreId = normalized
  persistStoreId(normalized)
}

/** Clear in-memory store context without wiping the persisted last-visited store. */
export const resetActiveBuyerStoreId = () => {
  runtimeStoreId = null
}

/** Marketplace navigation: no active store for header/API scoping. */
export const enterMarketplaceContext = () => {
  runtimeStoreId = null
}

/** Legacy `/store` route: bind to the bootstrap store from env. */
export const enterLegacyDefaultStoreContext = () => {
  setActiveBuyerStoreId(legacyDefaultStoreId)
}

/** Current page store context; null means marketplace/platform UI. */
export const resolveBuyerStoreId = () => runtimeStoreId

export const getPersistedBuyerStoreId = () => readPersistedStoreId()

export const getLegacyDefaultStoreId = () => legacyDefaultStoreId

export const getDefaultBuyerStoreId = () => legacyDefaultStoreId

export const isMarketplaceContext = () => !runtimeStoreId

export const getScopedBuyerStoreId = (explicitStoreId?: string | null) => {
  const resolved =
    explicitStoreId?.trim() ||
    runtimeStoreId ||
    readPersistedStoreId() ||
    legacyDefaultStoreId
  return resolved || legacyDefaultStoreId
}

/** Backward-compatible alias for store-scoped cart/checkout operations. */
export const getBuyerStoreId = () => getScopedBuyerStoreId()

/**
 * Bind store context from the current buyer route.
 * Indie single-store is the default; only `/marketplace` clears store scope.
 */
export const syncRouteStoreContext = (pathname: string) => {
  if (pathname.startsWith("/marketplace")) {
    enterMarketplaceContext()
    return
  }

  // /shops/:slug is resolved by the page after loading marketplace store metadata.
  if (pathname.startsWith("/shops/")) {
    return
  }

  // Single-store indie routes keep the current store binding once a seller/store
  // link has selected one. Cold starts fall back to the bootstrap default store.
  if (
    pathname === "/" ||
    pathname.startsWith("/store") ||
    pathname.startsWith("/studio") ||
    pathname.startsWith("/my-designs") ||
    pathname.startsWith("/ai-design") ||
    pathname.startsWith("/ai-studio") ||
    pathname.startsWith("/design") ||
    pathname.startsWith("/products") ||
    pathname.startsWith("/cart") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/orders") ||
    pathname.startsWith("/help") ||
    pathname.startsWith("/plans") ||
    pathname.startsWith("/about") ||
    pathname.startsWith("/cookies") ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/privacy")
  ) {
    if (runtimeStoreId) return
    enterLegacyDefaultStoreContext()
  }
}
