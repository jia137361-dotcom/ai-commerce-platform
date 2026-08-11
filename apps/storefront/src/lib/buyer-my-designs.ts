/** Identity-scoped My Design drafts (guest / buyer) — never share across logins. */

const LEGACY_DESIGNS_KEY = "citigoo:buyer-my-designs"
const GUEST_KEY = "citigoo:buyer-design-guest-key"
const MAX = 40

export type BuyerDesignDraft = {
  id: string
  mcProductId: string
  variantId?: string | null
  title: string
  mockupUrl?: string | null
  price?: number | null
  s2bProductId?: string | null
  basicProductId?: string | null
  blankProductId?: string | null
  status: "draft" | "ready" | "pending"
  savedAt: string
  sizeId?: string | null
  colorId?: string | null
  sizeName?: string | null
  colorName?: string | null
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">

const designsStorageKey = (identity: string) =>
  `citigoo:my-designs:${encodeURIComponent(identity)}`

const readGuestKey = (storage: StorageLike) => storage.getItem(GUEST_KEY)?.trim() || ""

const resolveStorage = (storage?: StorageLike) =>
  storage ?? (typeof window !== "undefined" ? window.localStorage : null)

export const getBuyerDesignGuestKey = (storage?: StorageLike) => {
  const store = resolveStorage(storage)
  if (!store) return ""
  let key = readGuestKey(store)
  if (!key) {
    key = `guest_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
    store.setItem(GUEST_KEY, key)
  }
  return key
}

/** Rotate guest identity so logout cannot reopen previous visitor designs. */
export const rotateBuyerDesignGuestKey = (storage?: StorageLike) => {
  const store = resolveStorage(storage)
  if (!store) return ""
  const previous = readGuestKey(store)
  if (previous) {
    store.removeItem(designsStorageKey(`guest:${previous}`))
  }
  store.removeItem(GUEST_KEY)
  return getBuyerDesignGuestKey(store)
}

export const getBuyerDesignIdentity = (
  customerId: string | null | undefined,
  storage?: StorageLike
) => {
  if (customerId) return `buyer:${customerId}`
  return `guest:${getBuyerDesignGuestKey(storage)}`
}

const readDrafts = (storageKey: string, storage: StorageLike): BuyerDesignDraft[] => {
  try {
    const raw = storage.getItem(storageKey)
    const parsed = raw ? (JSON.parse(raw) as BuyerDesignDraft[]) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export const listBuyerDesignDrafts = (
  customerId?: string | null,
  storage?: StorageLike
): BuyerDesignDraft[] => {
  const store = resolveStorage(storage)
  if (!store) return []
  const identity = getBuyerDesignIdentity(customerId, store)
  const scoped = readDrafts(designsStorageKey(identity), store)
  if (scoped.length || customerId) return scoped

  // One-time migrate legacy shared bucket into the current guest identity only.
  const legacy = readDrafts(LEGACY_DESIGNS_KEY, store)
  if (!legacy.length) return []
  store.setItem(designsStorageKey(identity), JSON.stringify(legacy.slice(0, MAX)))
  store.removeItem(LEGACY_DESIGNS_KEY)
  return legacy.slice(0, MAX)
}

export const upsertBuyerDesignDraft = (
  draft: Omit<BuyerDesignDraft, "id" | "savedAt"> & { id?: string },
  customerId?: string | null,
  storage?: StorageLike
) => {
  const store = resolveStorage(storage)
  if (!store) return null
  const next: BuyerDesignDraft = {
    id: draft.id || draft.mcProductId || `design_${Date.now()}`,
    mcProductId: draft.mcProductId,
    variantId: draft.variantId ?? null,
    title: draft.title,
    mockupUrl: draft.mockupUrl ?? null,
    price: draft.price ?? null,
    s2bProductId: draft.s2bProductId ?? null,
    basicProductId: draft.basicProductId ?? null,
    blankProductId: draft.blankProductId ?? null,
    status: draft.status,
    savedAt: new Date().toISOString(),
    sizeId: draft.sizeId ?? null,
    colorId: draft.colorId ?? null,
    sizeName: draft.sizeName ?? null,
    colorName: draft.colorName ?? null,
  }
  const identity = getBuyerDesignIdentity(customerId, store)
  const key = designsStorageKey(identity)
  const rest = listBuyerDesignDrafts(customerId, store).filter(
    (item) => item.id !== next.id && item.mcProductId !== next.mcProductId
  )
  store.setItem(key, JSON.stringify([next, ...rest].slice(0, MAX)))
  return next
}

export const removeBuyerDesignDraft = (
  id: string,
  customerId?: string | null,
  storage?: StorageLike
) => {
  const store = resolveStorage(storage)
  if (!store) return
  const identity = getBuyerDesignIdentity(customerId, store)
  const next = listBuyerDesignDrafts(customerId, store).filter(
    (item) => item.id !== id && item.mcProductId !== id
  )
  store.setItem(designsStorageKey(identity), JSON.stringify(next))
}

/** Wipe browser design mirrors and rotate guest key (call on sign-out). */
export const clearBuyerDesignClientState = (storage?: StorageLike) => {
  const store = resolveStorage(storage)
  if (!store) return
  store.removeItem(LEGACY_DESIGNS_KEY)
  rotateBuyerDesignGuestKey(store)
}
