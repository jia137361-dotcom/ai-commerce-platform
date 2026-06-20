import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import type { StoreCart } from "../../lib/mock-data"
import { CartSummaryCard } from "./CartSummaryCard"

describe("CartSummaryCard", () => {
  it("disables checkout when no valid item is available", () => {
    const cart: StoreCart = { id: "cart_empty", currencyCode: "usd", items: [], subtotal: 0, total: 0 }
    const html = renderToStaticMarkup(createElement(CartSummaryCard, { cart }))
    expect(html).toContain("Resolve unavailable items")
    expect(html).toContain('aria-disabled="true"')
    expect(html).not.toContain('href="/checkout"')
  })
})
