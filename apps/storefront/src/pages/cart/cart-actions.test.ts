import type { StoreCart } from "../../lib/mock-data"
import { removeCartItem, updateCartItemQuantity } from "./cart-actions"

const cart: StoreCart = { id: "cart_1", currencyCode: "usd", items: [], subtotal: 0, total: 0 }

describe("cart actions", () => {
  it("updates the correct line with the requested quantity", async () => {
    const updateLineItem = jest.fn(async () => cart)
    await updateCartItemQuantity("cart_1", "line_2", 3, { updateLineItem, deleteLineItem: jest.fn() })
    expect(updateLineItem).toHaveBeenCalledWith("cart_1", "line_2", 3)
  })

  it("removes the correct line", async () => {
    const deleteLineItem = jest.fn(async () => cart)
    await removeCartItem("cart_1", "line_2", { updateLineItem: jest.fn(), deleteLineItem })
    expect(deleteLineItem).toHaveBeenCalledWith("cart_1", "line_2")
  })
})
