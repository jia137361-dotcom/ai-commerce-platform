jest.mock("./buyer-api", () => ({
  addCartLineItem: jest.fn(),
  createCart: jest.fn(),
  fetchCart: jest.fn(),
  setActiveBuyerStoreId: jest.fn(),
}))

import { getScopedBuyerCartStorageKey } from "./buyer-cart-storage"
import { readdItemsToCart } from "./buyer-reorder-cart"
import type { StoreCart } from "./mock-data"

class MemoryStorage {
  private values = new Map<string, string>()

  get length() {
    return this.values.size
  }

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }

  removeItem(key: string) {
    this.values.delete(key)
  }

  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null
  }
}

const cart = (id: string, items: StoreCart["items"] = []): StoreCart => ({
  id,
  currencyCode: "usd",
  items,
  subtotal: 0,
  total: 0,
})

describe("readdItemsToCart", () => {
  it("adds expired reservation items into the existing normal cart without replacing it", async () => {
    const storage = new MemoryStorage()
    const storageKey = getScopedBuyerCartStorageKey("default_store", "buyer:cus_1")
    storage.setItem(storageKey, "cart_existing")
    const existingCart = cart("cart_existing", [
      { id: "line_existing", title: "Existing item", quantity: 1, variantId: "variant_existing" },
    ])
    const updatedCart = cart("cart_existing", [
      ...existingCart.items,
      { id: "line_readd", title: "Re-added item", quantity: 2, variantId: "variant_readd" },
    ])
    const fetchExistingCart = jest.fn(async () => existingCart)
    const createFreshCart = jest.fn(async () => cart("cart_new"))
    const addLineItem = jest.fn(async () => updatedCart)
    const registerCart = jest.fn()

    const result = await readdItemsToCart({
      storeId: "default_store",
      customerId: "cus_1",
      items: [{ variantId: "variant_readd", quantity: 2 }],
      storage: storage as unknown as Storage,
      fetchCart: fetchExistingCart,
      createCart: createFreshCart,
      addLineItem,
      registerCart,
      setActiveStoreId: jest.fn(),
    })

    expect(fetchExistingCart).toHaveBeenCalledWith("cart_existing", { storeId: "default_store" })
    expect(createFreshCart).not.toHaveBeenCalled()
    expect(addLineItem).toHaveBeenCalledWith("cart_existing", "variant_readd", 2, {
      storeId: "default_store",
    })
    expect(registerCart).toHaveBeenCalledWith(storage, "buyer:cus_1", "default_store", "cart_existing", {
      storeName: undefined,
      storeSlug: undefined,
    })
    expect(result.cart.id).toBe("cart_existing")
    expect(result.cart.items.map((item) => item.variantId)).toEqual(["variant_existing", "variant_readd"])
    expect(result.cartHref).toBe("/cart")
    expect(result.reusedExistingCart).toBe(true)
  })

  it("creates a normal cart when the current stored cart is the expired checkout reservation", async () => {
    const storage = new MemoryStorage()
    const storageKey = getScopedBuyerCartStorageKey("default_store", "buyer:cus_1")
    storage.setItem(storageKey, "cart_reserved")
    const createdCart = cart("cart_new")
    const updatedCart = cart("cart_new", [
      { id: "line_readd", title: "Re-added item", quantity: 1, variantId: "variant_readd" },
    ])
    const fetchExistingCart = jest.fn(async () => cart("cart_reserved"))
    const createFreshCart = jest.fn(async () => createdCart)
    const addLineItem = jest.fn(async () => updatedCart)
    const registerCart = jest.fn((nextStorage: Storage, identity: string, storeId: string, cartId: string) => {
      nextStorage.setItem(getScopedBuyerCartStorageKey(storeId, identity), cartId)
    })

    const result = await readdItemsToCart({
      storeId: "default_store",
      customerId: "cus_1",
      items: [{ variantId: "variant_readd", quantity: 1 }],
      reservedCartIds: ["cart_reserved"],
      storage: storage as unknown as Storage,
      fetchCart: fetchExistingCart,
      createCart: createFreshCart,
      addLineItem,
      registerCart,
      setActiveStoreId: jest.fn(),
    })

    expect(fetchExistingCart).not.toHaveBeenCalled()
    expect(createFreshCart).toHaveBeenCalledWith({ storeId: "default_store", countryCode: "us" })
    expect(addLineItem).toHaveBeenCalledWith("cart_new", "variant_readd", 1, {
      storeId: "default_store",
    })
    expect(storage.getItem(storageKey)).toBe("cart_new")
    expect(result.cart.id).toBe("cart_new")
    expect(result.reusedExistingCart).toBe(false)
  })
})
