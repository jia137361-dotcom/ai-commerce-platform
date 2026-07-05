import {
  composePlatformLineKey,
  discoverStoreCartRegistry,
  parsePlatformLineKey,
  registerStoreCart,
} from "./buyer-platform-cart"

describe("buyer-platform-cart", () => {
  it("registers and discovers store carts by identity", () => {
    const values = new Map<string, string>()
    const storage = {
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
    }

    registerStoreCart(storage, "guest:abc", "store_a", "cart_a", {
      storeName: "Store A",
      storeSlug: "store-a",
    })
    storage.setItem("citigoo:store_b:cart:guest%3Aabc", "cart_b")

    const registry = discoverStoreCartRegistry(storage, "guest:abc")
    expect(registry.store_a).toMatchObject({ cartId: "cart_a", storeName: "Store A" })
    expect(registry.store_b).toMatchObject({ cartId: "cart_b" })
  })

  it("composes and parses platform line keys", () => {
    const key = composePlatformLineKey("store_a", "line_1")
    expect(parsePlatformLineKey(key)).toEqual({ storeId: "store_a", lineId: "line_1" })
  })
})
