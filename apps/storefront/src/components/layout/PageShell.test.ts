import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { PageShell } from "./PageShell"

jest.mock("../../auth/useBuyerAuth", () => ({
  useBuyerAuth: () => ({ customer: null, isLoading: false }),
}))

jest.mock("../../lib/buyer-api", () => ({
  getScopedBuyerStoreId: () => "default_store",
}))

jest.mock("../../lib/storefront-links", () => ({
  buildStoreMessagesHref: () => "/account/messages",
}))

describe("PageShell", () => {
  it("renders mobile bottom nav by default", () => {
    const html = renderToStaticMarkup(
      createElement(PageShell, { cartCount: 2 }, "content")
    )
    expect(html).toContain("buyer-mobile-bottom-nav")
    expect(html).toContain("has-mobile-bottom-nav")
    expect(html).toContain("Cart 2")
  })

  it("hides mobile bottom nav when disabled", () => {
    const html = renderToStaticMarkup(
      createElement(
        PageShell,
        { showMobileBottomNav: false, cartCount: 1 },
        "content"
      )
    )
    expect(html).not.toContain("buyer-mobile-bottom-nav")
    expect(html).not.toContain("has-mobile-bottom-nav")
  })
})
