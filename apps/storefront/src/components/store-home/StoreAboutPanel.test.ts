import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import type { BuyerStoreSettings } from "../../lib/buyer-api"
import { StoreAboutPanel, StoreInformationContent } from "./StoreAboutPanel"

const settings: BuyerStoreSettings = {
  storeId: "isolated_store",
  brandName: "MKT01 Stripe Test Store",
  supportEmail: "support@example.com",
  description: "A real seller-managed description.",
  announcement: "A real seller announcement.",
  bannerUrl: "https://example.com/banner.png",
  logoUrl: "https://example.com/logo.png",
  galleryUrls: [],
  metadata: {},
  returnsPolicy: "Returns accepted within the seller policy window.",
}

describe("StoreAboutPanel", () => {
  it("renders real shop metadata and the complete information sidebar", () => {
    const html = renderToStaticMarkup(createElement(StoreAboutPanel, { settings }))

    expect(html).toContain("MKT01 Stripe Test Store")
    expect(html).toContain("A real seller-managed description.")
    expect(html).toContain("A real seller announcement.")
    expect(html).toContain("support@example.com")
    expect(html).not.toContain("Inside the shop")
    expect(html).not.toContain("Gallery image selector")
    expect(html).toContain("Shipping")
    expect(html).toContain("Returns &amp; exchanges")
    expect(html).toContain("Privacy Policy")
    expect(html).not.toContain("FAQs")
    expect(html).toContain("Message the seller")
    expect(html).toContain("Signed-in buyers can chat with the store team")
  })

  it("keeps unsupported capabilities honest", () => {
    const returnsHtml = renderToStaticMarkup(createElement(StoreInformationContent, { section: "returns", settings }))

    expect(returnsHtml).toContain("Returns accepted within the seller policy window.")
    expect(returnsHtml).toContain("not available in the buyer portal yet")
  })

  it("shows honest empty states when seller metadata is absent", () => {
    const html = renderToStaticMarkup(createElement(StoreAboutPanel, {
      settings: { storeId: "isolated_store", brandName: "Empty Store", metadata: {}, galleryUrls: [] },
    }))

    expect(html).toContain("has not added an about description")
    expect(html).toContain("Seller support email unavailable")
  })
})
