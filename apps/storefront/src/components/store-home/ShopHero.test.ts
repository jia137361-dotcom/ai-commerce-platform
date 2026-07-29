import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { ShopHero } from "./ShopHero"

describe("ShopHero", () => {
  it("renders seller-managed store information", () => {
    const html = renderToStaticMarkup(createElement(ShopHero, {
      brandName: "Seller Studio",
      announcement: "Summer drop",
      description: "Made to order goods",
      imageUrl: "https://example.com/banner.jpg",
    }))
    expect(html).toContain("Seller Studio")
    expect(html).toContain("Summer drop")
    expect(html).toContain("Made to order goods")
    expect(html).toContain("banner.jpg")
  })

  it("uses an honest gradient fallback instead of inventing a banner image", () => {
    const html = renderToStaticMarkup(createElement(ShopHero, {
      brandName: "Seller Studio",
      isFallback: true,
    }))

    expect(html).toContain("Banner fallback")
    expect(html).not.toContain("url(&quot;")
    expect(html).toContain('href="/marketplace"')
  })
})
