import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import type { StoreProduct } from "../../lib/mock-data"
import { ProductCard } from "./ProductCard"

const product: StoreProduct = {
  id: "prod_123",
  title: "Modern tote",
  category: "Handbags",
  price: "$24.50 USD",
  numericPrice: 24.5,
  imageUrl: "https://example.com/tote.jpg",
  medusaVariantId: "variant_123",
  isCartAddable: true,
}

describe("ProductCard", () => {
  it("renders the title, image, price, and product detail link", () => {
    const html = renderToStaticMarkup(createElement(ProductCard, { product }))
    expect(html).toContain("Modern tote")
    expect(html).toContain("https://example.com/tote.jpg")
    expect(html).toContain("$24.50")
    expect(html).toContain('href="/products/prod_123"')
  })

  it("renders an explicit placeholder when the image is missing", () => {
    const html = renderToStaticMarkup(createElement(ProductCard, { product: { ...product, imageUrl: "" } }))
    expect(html).toContain("Product image unavailable")
    expect(html).not.toContain("undefined")
  })
})
