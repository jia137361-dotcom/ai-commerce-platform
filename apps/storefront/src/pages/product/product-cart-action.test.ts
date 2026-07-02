import type { StoreCart } from "../../lib/mock-data"
import { addProductSelectionToCart } from "./product-cart-action"

const cart = (id: string): StoreCart => ({ id, currencyCode: "usd", items: [], subtotal: 0, total: 0 })

describe("addProductSelectionToCart", () => {
  it("adds the selected variant and quantity to the existing cart", async () => {
    const values = new Map([["cart-key", "cart_existing"]])
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) } }
    const addLineItem = jest.fn(async () => cart("cart_existing"))
    const createCart = jest.fn(async () => cart("cart_new"))

    await addProductSelectionToCart({ variantId: "variant_selected", quantity: 3, storageKey: "cart-key", storage, createCart, addLineItem })

    expect(addLineItem).toHaveBeenCalledTimes(1)
    expect(addLineItem).toHaveBeenCalledWith("cart_existing", "variant_selected", 3)
    expect(createCart).not.toHaveBeenCalled()
  })
})
