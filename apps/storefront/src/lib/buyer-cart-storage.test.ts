import { getBuyerCartIdentity, getScopedBuyerCartStorageKey, removeLegacySharedCartKey } from "./buyer-cart-storage"

const memoryStorage = () => {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  }
}

describe("buyer cart storage isolation", () => {
  it("scopes logged-in carts by store and buyer", () => {
    const storage = memoryStorage()
    const buyerA = getBuyerCartIdentity("cus_a", storage)
    const buyerB = getBuyerCartIdentity("cus_b", storage)
    expect(getScopedBuyerCartStorageKey("default_store", buyerA)).not.toBe(
      getScopedBuyerCartStorageKey("default_store", buyerB)
    )
    expect(getScopedBuyerCartStorageKey("store_two", buyerA)).not.toBe(
      getScopedBuyerCartStorageKey("default_store", buyerA)
    )
  })

  it("keeps one stable guest session without sharing the legacy cart key", () => {
    const storage = memoryStorage()
    const first = getBuyerCartIdentity(null, storage)
    expect(getBuyerCartIdentity(undefined, storage)).toBe(first)
    storage.setItem("citigoo:default_store:cart_id", "cart_shared")
    removeLegacySharedCartKey("default_store", storage)
    expect(storage.getItem("citigoo:default_store:cart_id")).toBeNull()
  })
})
