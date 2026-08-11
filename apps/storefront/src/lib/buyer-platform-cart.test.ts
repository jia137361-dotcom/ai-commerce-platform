import {
  composePlatformLineKey,
  discoverStoreCartRegistry,
  parsePlatformLineKey,
  registerStoreCart,
  unregisterStoreCart,
} from "./buyer-platform-cart"

const makeStorage = () => {
  const values = new Map<string, string>()
  return {
    storage: {
      get length() {
        return values.size
      },
      key: (index: number) => [...values.keys()][index] ?? null,
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value)
      },
      removeItem: (key: string) => {
        values.delete(key)
      },
    },
  }
}

describe("buyer-platform-cart", () => {
  it("registers and discovers store carts by identity", () => {
    const { storage } = makeStorage()

    registerStoreCart(storage, "guest:abc", "store_a", "cart_a", {
      storeName: "Store A",
      storeSlug: "store-a",
    })
    storage.setItem("citigoo:store_b:cart:guest%3Aabc", "cart_b")

    const registry = discoverStoreCartRegistry(storage, "guest:abc")
    expect(registry.store_a).toMatchObject({ cartId: "cart_a", storeName: "Store A" })
    expect(registry.store_b).toMatchObject({ cartId: "cart_b" })
  })

  it("unregisters a completed store cart from both registry and scoped storage", () => {
    const { storage } = makeStorage()
    registerStoreCart(storage, "buyer:cus_1", "store_a", "cart_a")

    unregisterStoreCart(storage, "buyer:cus_1", "store_a")

    expect(discoverStoreCartRegistry(storage, "buyer:cus_1")).toEqual({})
    expect(storage.getItem("citigoo:store_a:cart:buyer%3Acus_1")).toBeNull()
  })

  it("composes and parses platform line keys", () => {
    const key = composePlatformLineKey("store_a", "line_1")
    expect(parsePlatformLineKey(key)).toEqual({ storeId: "store_a", lineId: "line_1" })
  })
})
