import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import type { BuyerStoreSettings } from "../../lib/buyer-api"
import { normalizeStoreGalleryUrls, StoreAboutPanel, StoreInformationContent } from "./StoreAboutPanel"

const settings: BuyerStoreSettings = {
  storeId: "isolated_store",
  brandName: "MKT01 Stripe Test Store",
  supportEmail: "support@example.com",
  description: "A real seller-managed description.",
  announcement: "A real seller announcement.",
  bannerUrl: "https://example.com/banner.png",
  logoUrl: "https://example.com/logo.png",
  galleryUrls: ["https://example.com/gallery-1.png", "https://picsum.photos/id/1025/800/600"],
  metadata: {},
}

describe("StoreAboutPanel", () => {
  it("renders real shop metadata and the complete information sidebar", () => {
    const html = renderToStaticMarkup(createElement(StoreAboutPanel, { settings }))

    expect(html).toContain("MKT01 Stripe Test Store")
    expect(html).toContain("A real seller-managed description.")
    expect(html).toContain("A real seller announcement.")
    expect(html).toContain("support@example.com")
    expect(html).toContain("gallery-1.png")
    expect(html).toContain("picsum.photos/id/1025/800/600")
    expect(html).toContain("Shipping")
    expect(html).toContain("Returns &amp; exchanges")
    expect(html).toContain("Privacy Policy")
    expect(html).toContain("Message us via Help Center")
    expect(html).toContain("Direct seller messaging is unavailable.")
  })

  it("keeps unsupported capabilities honest", () => {
    const returnsHtml = renderToStaticMarkup(createElement(StoreInformationContent, { section: "returns", settings }))
    const faqHtml = renderToStaticMarkup(createElement(StoreInformationContent, { section: "faqs", settings }))

    expect(returnsHtml).toContain("not available in the buyer portal yet")
    expect(faqHtml).toContain("Direct buyer–seller messaging is not available yet")
    expect(faqHtml).toContain("only after shipping evidence is available")
  })

  it("hides empty or unsafe gallery values and preserves direct image URLs", () => {
    expect(normalizeStoreGalleryUrls([
      "",
      "  ",
      "javascript:alert(1)",
      "data:image/png;base64,test",
      "https://placehold.co/800x600/png?text=Gallery",
      "https://placehold.co/800x600/png?text=Gallery",
      " http://example.com/image.jpg ",
    ])).toEqual([
      "https://placehold.co/800x600/png?text=Gallery",
      "http://example.com/image.jpg",
    ])
  })

  it("shows honest empty states when seller metadata is absent", () => {
    const html = renderToStaticMarkup(createElement(StoreAboutPanel, {
      settings: { storeId: "isolated_store", brandName: "Empty Store", metadata: {}, galleryUrls: [] },
    }))

    expect(html).toContain("has not added an about description")
    expect(html).toContain("Store gallery has not been provided")
    expect(html).toContain("Seller support email unavailable")
  })
})
