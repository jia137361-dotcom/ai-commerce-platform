import { getScopedBuyerCartStorageKey } from "./buyer-cart-storage"
import type { StoreCart } from "./mock-data"
import type { MarketplaceStore } from "./buyer-api"

export type StoreCartRegistryEntry = {
  cartId: string
  storeName?: string
  storeSlug?: string
}

export type PlatformCartRegistry = Record<string, StoreCartRegistryEntry>

export type PlatformCartGroup = {
  storeId: string
  storeName: string
  storeSlug?: string
  cart: StoreCart
}

export type PlatformCart = {
  groups: PlatformCartGroup[]
  totalItems: number
  grandSubtotal: number
}

type ReadWriteStorage = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">

const REGISTRY_PREFIX = "citigoo:platform:carts:"

export const getPlatformCartRegistryKey = (identity: string) =>
  `${REGISTRY_PREFIX}${encodeURIComponent(identity)}`

const parseRegistry = (raw: string | null): PlatformCartRegistry => {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object") return {}
    const registry: PlatformCartRegistry = {}
    for (const [storeId, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!storeId.trim()) continue
      if (typeof value === "string" && value.trim()) {
        registry[storeId] = { cartId: value.trim() }
        continue
      }
      if (!value || typeof value !== "object") continue
      const row = value as StoreCartRegistryEntry
      if (typeof row.cartId === "string" && row.cartId.trim()) {
        registry[storeId] = {
          cartId: row.cartId.trim(),
          storeName: row.storeName,
          storeSlug: row.storeSlug,
        }
      }
    }
    return registry
  } catch {
    return {}
  }
}

export const readPlatformCartRegistry = (storage: ReadWriteStorage, identity: string) =>
  parseRegistry(storage.getItem(getPlatformCartRegistryKey(identity)))

export const writePlatformCartRegistry = (
  storage: ReadWriteStorage,
  identity: string,
  registry: PlatformCartRegistry
) => {
  storage.setItem(getPlatformCartRegistryKey(identity), JSON.stringify(registry))
}

export const discoverStoreCartRegistry = (storage: ReadWriteStorage, identity: string) => {
  const discovered = readPlatformCartRegistry(storage, identity)
  const suffix = `:cart:${encodeURIComponent(identity)}`
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (!key?.startsWith("citigoo:") || !key.endsWith(suffix)) continue
    const storeId = key.slice("citigoo:".length, key.length - suffix.length)
    if (!storeId || storeId.startsWith("platform")) continue
    const cartId = storage.getItem(key)?.trim()
    if (!cartId) continue
    discovered[storeId] = {
      cartId,
      storeName: discovered[storeId]?.storeName,
      storeSlug: discovered[storeId]?.storeSlug,
    }
  }
  return discovered
}

export const registerStoreCart = (
  storage: ReadWriteStorage,
  identity: string,
  storeId: string,
  cartId: string,
  meta?: { storeName?: string; storeSlug?: string }
) => {
  const registry = discoverStoreCartRegistry(storage, identity)
  registry[storeId] = {
    cartId,
    storeName: meta?.storeName ?? registry[storeId]?.storeName,
    storeSlug: meta?.storeSlug ?? registry[storeId]?.storeSlug,
  }
  writePlatformCartRegistry(storage, identity, registry)
  storage.setItem(getScopedBuyerCartStorageKey(storeId, identity), cartId)
}

export const unregisterStoreCart = (storage: ReadWriteStorage, identity: string, storeId: string) => {
  const registry = discoverStoreCartRegistry(storage, identity)
  delete registry[storeId]
  writePlatformCartRegistry(storage, identity, registry)
}

const resolveStoreLabel = (
  storeId: string,
  entry: StoreCartRegistryEntry,
  storesById: Map<string, MarketplaceStore>
) => {
  const fromMarketplace = storesById.get(storeId)
  return {
    storeName: entry.storeName ?? fromMarketplace?.brandName ?? fromMarketplace?.name ?? storeId,
    storeSlug: entry.storeSlug ?? fromMarketplace?.slug,
  }
}

export async function fetchPlatformCart(
  storage: ReadWriteStorage,
  identity: string
): Promise<PlatformCart> {
  const { fetchCart, fetchMarketplaceStores } = await import("./buyer-api")
  const registry = discoverStoreCartRegistry(storage, identity)
  const storeIds = Object.keys(registry)
  if (!storeIds.length) {
    return { groups: [], totalItems: 0, grandSubtotal: 0 }
  }

  let storesById = new Map<string, MarketplaceStore>()
  try {
    const storesResult = await fetchMarketplaceStores()
    storesById = new Map(storesResult.data.map((store) => [store.storeId, store]))
  } catch {
    storesById = new Map()
  }

  const groups: PlatformCartGroup[] = []
  let totalItems = 0
  let grandSubtotal = 0
  const nextRegistry: PlatformCartRegistry = { ...registry }

  await Promise.all(
    storeIds.map(async (storeId) => {
      const entry = registry[storeId]
      if (!entry?.cartId) return
      try {
        const cart = await fetchCart(entry.cartId, { storeId })
        if (!cart.items.length) {
          delete nextRegistry[storeId]
          storage.removeItem(getScopedBuyerCartStorageKey(storeId, identity))
          return
        }
        const labels = resolveStoreLabel(storeId, entry, storesById)
        nextRegistry[storeId] = { ...entry, ...labels }
        groups.push({
          storeId,
          storeName: labels.storeName,
          storeSlug: labels.storeSlug,
          cart: { ...cart, storeId: cart.storeId ?? storeId },
        })
        totalItems += cart.items.reduce((sum, item) => sum + item.quantity, 0)
        grandSubtotal += cart.subtotal
      } catch {
        delete nextRegistry[storeId]
        storage.removeItem(getScopedBuyerCartStorageKey(storeId, identity))
      }
    })
  )

  writePlatformCartRegistry(storage, identity, nextRegistry)

  groups.sort((left, right) => left.storeName.localeCompare(right.storeName))

  return { groups, totalItems, grandSubtotal }
}

export async function countPlatformCartItems(
  storage: ReadWriteStorage,
  identity: string
): Promise<number> {
  const platformCart = await fetchPlatformCart(storage, identity)
  return platformCart.totalItems
}

export const composePlatformLineKey = (storeId: string, lineId: string) => `${storeId}::${lineId}`

export const parsePlatformLineKey = (value: string) => {
  const separator = value.indexOf("::")
  if (separator <= 0) return null
  return {
    storeId: value.slice(0, separator),
    lineId: value.slice(separator + 2),
  }
}
