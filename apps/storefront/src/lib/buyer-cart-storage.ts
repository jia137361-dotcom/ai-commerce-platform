const GUEST_SESSION_KEY = "citigoo:buyer_guest_session"

type ReadWriteStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">

const createGuestSessionId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

export const getBuyerCartIdentity = (
  customerId: string | null | undefined,
  storage: ReadWriteStorage
) => {
  if (customerId) return `buyer:${customerId}`
  const existing = storage.getItem(GUEST_SESSION_KEY)
  if (existing) return `guest:${existing}`
  const created = createGuestSessionId()
  storage.setItem(GUEST_SESSION_KEY, created)
  return `guest:${created}`
}

export const getScopedBuyerCartStorageKey = (storeId: string, identity: string) =>
  `citigoo:${storeId}:cart:${encodeURIComponent(identity)}`

export const getBuyerGuestCartIdentity = (storage: ReadWriteStorage) => {
  const existing = storage.getItem(GUEST_SESSION_KEY)
  return existing ? `guest:${existing}` : null
}

export const resolveBuyerCartStorageId = (
  storeId: string,
  customerId: string | null | undefined,
  storage: ReadWriteStorage
) => {
  const preferredIdentity = getBuyerCartIdentity(customerId, storage)
  const preferredKey = getScopedBuyerCartStorageKey(storeId, preferredIdentity)
  const preferredCartId = storage.getItem(preferredKey)
  if (preferredCartId) {
    return { cartId: preferredCartId, identity: preferredIdentity, storageKey: preferredKey }
  }

  // Logged-in checkout previously missed items written into the guest cart key.
  if (customerId) {
    const guestIdentity = getBuyerGuestCartIdentity(storage)
    if (guestIdentity) {
      const guestKey = getScopedBuyerCartStorageKey(storeId, guestIdentity)
      const guestCartId = storage.getItem(guestKey)
      if (guestCartId) {
        storage.setItem(preferredKey, guestCartId)
        return { cartId: guestCartId, identity: preferredIdentity, storageKey: preferredKey }
      }
    }
  }

  return { cartId: null, identity: preferredIdentity, storageKey: preferredKey }
}

export const removeLegacySharedCartKey = (storeId: string, storage: ReadWriteStorage) => {
  storage.removeItem(`citigoo:${storeId}:cart_id`)
}
