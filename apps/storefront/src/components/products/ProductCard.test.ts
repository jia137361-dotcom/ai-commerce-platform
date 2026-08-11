import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import type { StoreProduct } from "../../lib/mock-data"
import { BuyerLocaleProvider } from "../../lib/locale"
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

const render = (value: StoreProduct) =>
  renderToStaticMarkup(createElement(BuyerLocaleProvider, null, createElement(ProductCard, { product: value })))

describe("ProductCard", () => {
  it("renders the title, image, price, and product detail link", () => {
    const html = render(product)
    expect(html).toContain("Modern tote")
    expect(html).toContain("https://example.com/tote.jpg")
    expect(html).toContain("$24.50")
    expect(html).toContain('href="/products/prod_123"')
  })

  it("renders an explicit placeholder when the image is missing", () => {
    const html = render({ ...product, imageUrl: "" })
    expect(html).toContain("Product image unavailable")
    expect(html).not.toContain("undefined")
  })

  it("keeps designable products as normal storefront product cards", () => {
    const html = render({ ...product, hasDesigner: true })
    expect(html).toContain('href="/products/prod_123"')
    expect(html).not.toContain("Customize")
    expect(html).not.toContain('href="/design/prod_123"')
    expect(html).not.toContain("/ai-design?productId=prod_123")
  })

  it("shows a ship-from flag badge when country code is present", () => {
    const html = render({
      ...product,
      shipFromCountry: "US",
      shipFromLabel: "United States",
    })
    expect(html).toContain("buyer-shop-product-ship-flag")
    expect(html).toContain("https://flagcdn.com/w40/us.png")
    expect(html).toContain("Ships from United States")
  })
})
