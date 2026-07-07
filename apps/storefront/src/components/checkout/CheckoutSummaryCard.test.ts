import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import type { StoreCart } from "../../lib/mock-data"
import { CheckoutSummaryCard } from "./CheckoutSummaryCard"

const cart: StoreCart = { id: "cart_1", currencyCode: "usd", subtotal: 21.25, total: 21.25, hasSubtotal: true, hasTotal: true, items: [{ id: "line_1", title: "Real cart item", imageUrl: undefined, quantity: 1, unitPrice: 21.25, total: 21.25, hasUnitPrice: true, hasTotal: true, variantId: "variant_1" }] }

describe("CheckoutSummaryCard", () => {
  it("renders real cart item and totals", () => {
    const html = renderToStaticMarkup(createElement(CheckoutSummaryCard, { cart, canPlaceOrder: true, onPlaceOrder: () => undefined, placing: false }))
    expect(html).toContain("Real cart item")
    expect(html).toContain("$21.25")
    expect(html).toContain("Place order")
  })
  it("disables place order for invalid checkout state", () => expect(renderToStaticMarkup(createElement(CheckoutSummaryCard, { cart, canPlaceOrder: false, onPlaceOrder: () => undefined, placing: false }))).toContain("disabled"))
})
