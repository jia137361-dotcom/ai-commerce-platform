import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import type { BuyerCartItemView } from "../../lib/buyer-cart"
import { CartItemCard } from "./CartItemCard"

const item: BuyerCartItemView = { id: "line_1", title: "Travel mug", imageUrl: "https://example.com/mug.jpg", productHref: "/products/prod_1", variantLabel: "Color: Black", quantity: 2, unitPrice: 12, lineTotal: 24, isAvailable: true }

describe("CartItemCard", () => {
  it("renders title, variant, quantity, image, and price", () => {
    const html = renderToStaticMarkup(createElement(CartItemCard, { item, currencyCode: "usd", updating: false, onQuantityChange: () => undefined, onDeleteRequest: () => undefined }))
    expect(html).toContain("Travel mug")
    expect(html).toContain("Color: Black")
    expect(html).toContain("https://example.com/mug.jpg")
    expect(html).toContain("$24.00")
    expect(html).toContain(">2<")
  })
})
