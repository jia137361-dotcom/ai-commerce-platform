import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { BuyerLocaleProvider } from "../../lib/locale"
import { ShopHero } from "./ShopHero"

const renderHero = (props: Parameters<typeof ShopHero>[0]) =>
  renderToStaticMarkup(
    createElement(BuyerLocaleProvider, null, createElement(ShopHero, props))
  )

describe("ShopHero", () => {
  it("renders seller-managed store information", () => {
    const html = renderHero({
      brandName: "Seller Studio",
      announcement: "Summer drop",
      description: "Made to order goods",
      imageUrl: "https://example.com/banner.jpg",
    })
    expect(html).toContain("Seller Studio")
    expect(html).toContain("Summer drop")
    expect(html).toContain("Made to order goods")
    expect(html).toContain("banner.jpg")
  })

  it("uses an honest gradient fallback instead of inventing a banner image", () => {
    const html = renderHero({
      brandName: "Seller Studio",
      isFallback: true,
    })

    expect(html).toContain("Add a store banner in seller settings")
    expect(html).not.toContain("url(&quot;")
    expect(html).toContain('href="/marketplace"')
  })

  it("starts AI design directly instead of linking to standalone product selection", () => {
    const html = renderHero({
      brandName: "Seller Studio",
    })

    expect(html).toContain('href="/ai-design"')
    expect(html).not.toContain('href="/trends"')
  })
})
