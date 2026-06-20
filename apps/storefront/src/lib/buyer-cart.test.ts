import { canCheckoutCart, normalizeBuyerCartItem } from "./buyer-cart"
import type { CartLineItem, StoreCart } from "./mock-data"

const line: CartLineItem = { id: "line_1", title: "Cart product", imageUrl: undefined, quantity: 2, unitPrice: 0, total: 0, hasUnitPrice: false, hasTotal: false, variantId: "variant_1" }

describe("buyer cart normalization", () => {
  it("preserves missing image and price as unavailable", () => {
    const item = normalizeBuyerCartItem(line)
    expect(item.imageUrl).toBeUndefined()
    expect(item.unitPrice).toBeUndefined()
    expect(item.lineTotal).toBeUndefined()
  })

  it("safely normalizes quantity and variant details", () => {
    const item = normalizeBuyerCartItem({ ...line, quantity: 0, variantTitle: "Large", hasUnitPrice: true, hasTotal: true })
    expect(item.quantity).toBe(1)
    expect(item.variantLabel).toBe("Large")
  })

  it("does not allow checkout when a line price is unavailable", () => {
    const cart: StoreCart = { id: "cart_1", currencyCode: "usd", items: [line], subtotal: 0, total: 0, hasTotal: false }
    expect(canCheckoutCart(cart)).toBe(false)
  })
})
