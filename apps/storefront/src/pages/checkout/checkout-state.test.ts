import type { StoreCart } from "../../lib/mock-data"
import { resolveCheckoutState } from "./checkout-state"

const validCart: StoreCart = {
  id: "cart_1",
  currencyCode: "usd",
  subtotal: 21.25,
  total: 21.25,
  hasSubtotal: true,
  hasTotal: true,
  items: [{ id: "line_1", title: "Product", quantity: 1, unitPrice: 21.25, total: 21.25, hasUnitPrice: true, hasTotal: true, variantId: "variant_1" }],
}

const base = { cart: validCart, authLoading: false, authenticated: true, emailVerified: true, contactValid: true, requiresShippingMethod: false, addressValid: false, addressSaved: false, shippingMethodSaved: false, paymentSessionReady: true, placingOrder: false }

describe("checkout state", () => {
  it("handles an empty cart", () => expect(resolveCheckoutState({ ...base, cart: null })).toEqual(expect.objectContaining({ canPlaceOrder: false, disabledReason: "Cart is empty." })))
  it("blocks unavailable cart items", () => {
    const cart = { ...validCart, items: [{ ...validCart.items[0], variantId: undefined }] }
    expect(resolveCheckoutState({ ...base, cart }).disabledReason).toContain("unavailable cart items")
  })
  it("blocks missing prices", () => {
    const cart = { ...validCart, hasTotal: false, items: [{ ...validCart.items[0], hasTotal: false, hasUnitPrice: false }] }
    expect(resolveCheckoutState({ ...base, cart }).canPlaceOrder).toBe(false)
  })
  it("allows guest checkout when contact is valid", () =>
    expect(resolveCheckoutState({ ...base, authenticated: false }).canPlaceOrder).toBe(true)
  )
  it("blocks logged-in checkout when email is not verified", () =>
    expect(resolveCheckoutState({ ...base, emailVerified: false }).disabledReason).toContain("Verify your account email")
  )
  it("allows a valid non-shipping order without address or shipping method", () =>
    expect(resolveCheckoutState(base).canPlaceOrder).toBe(true)
  )
  it("blocks checkout without a valid payment session", () =>
    expect(resolveCheckoutState({ ...base, paymentSessionReady: false })).toEqual(expect.objectContaining({ canPlaceOrder: false, disabledReason: expect.stringContaining("payment session") })))
})
