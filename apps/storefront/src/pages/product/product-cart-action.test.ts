import type { StoreCart } from "../../lib/mock-data"
import { addProductSelectionToCart } from "./product-cart-action"

const cart = (id: string): StoreCart => ({ id, currencyCode: "usd", items: [], subtotal: 0, total: 0 })

describe("addProductSelectionToCart", () => {
  it("adds the selected variant and quantity to the existing cart", async () => {
    const values = new Map([["cart-key", "cart_existing"]])
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value) },
      removeItem: (key: string) => { values.delete(key) },
      key: () => null,
      length: 0,
    }
    const addLineItem = jest.fn(async () => cart("cart_existing"))
    const createCart = jest.fn(async () => cart("cart_new"))

    await addProductSelectionToCart({
      storeId: "default_store",
      cartIdentity: "guest:test",
      variantId: "variant_selected",
      quantity: 3,
      storageKey: "cart-key",
      storage,
      createCart,
      addLineItem,
    })

    expect(addLineItem).toHaveBeenCalledTimes(1)
    expect(addLineItem).toHaveBeenCalledWith("cart_existing", "variant_selected", 3)
    expect(createCart).not.toHaveBeenCalled()
  })

  it("creates a fresh cart when the stored cart is an unpaid checkout reservation", async () => {
    const values = new Map([["cart-key", "cart_reserved"]])
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value) },
      removeItem: (key: string) => { values.delete(key) },
      key: () => null,
      length: 0,
    }
    const addLineItem = jest.fn(async () => cart("cart_new"))
    const createCart = jest.fn(async () => cart("cart_new"))

    await addProductSelectionToCart({
      storeId: "default_store",
      cartIdentity: "buyer:cus_1",
      variantId: "variant_selected",
      quantity: 1,
      storageKey: "cart-key",
      storage,
      createCart,
      addLineItem,
      isCartReservedForCheckout: jest.fn(async (cartId) => cartId === "cart_reserved"),
    })

    expect(createCart).toHaveBeenCalledTimes(1)
    expect(addLineItem).toHaveBeenCalledWith("cart_new", "variant_selected", 1)
    expect(values.get("cart-key")).toBe("cart_new")
  })
})
