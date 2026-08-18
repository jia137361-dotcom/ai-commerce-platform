import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { AccountHoverPanel } from "./AccountHoverPanel"
import { FeatureMenuPanel } from "./FeatureMenuPanel"

const authState = {
  customer: { id: "cus_1", email: "buyer@example.com" },
  signOut: jest.fn(async () => undefined),
}

jest.mock("../../auth/useBuyerAuth", () => ({
  useBuyerAuth: () => authState,
}))

describe("storefront topbar menus", () => {
  it("keeps account menu scoped to account actions", () => {
    const html = renderToStaticMarkup(createElement(AccountHoverPanel))

    expect(html).toContain("buyer@example.com")
    expect(html).toContain("Account overview")
    expect(html).toContain("Orders")
    expect(html).toContain("My Designs")
    expect(html).toContain('href="/my-designs"')
    expect(html).toContain("Profile")
    expect(html).toContain("Addresses")
    expect(html).toContain("Account security")
    expect(html).toContain("Switch account")
    expect(html).toContain("Log out")
    expect(html).not.toContain("AI design")
    expect(html).not.toContain("Product selection")
    expect(html).not.toContain("My Saved")
  })

  it("keeps feature menu scoped to create tools with My Designs prominent", () => {
    const html = renderToStaticMarkup(createElement(FeatureMenuPanel))

    expect(html).toContain("AI design")
    expect(html).toContain('href="/ai-design"')
    expect(html).toContain("My Designs")
    expect(html).toContain('href="/my-designs"')
    expect(html).toContain("Orders")
    expect(html).toContain('href="/account/orders"')
    expect(html).not.toContain("Product selection")
    expect(html).not.toContain('href="/trends"')
    expect(html).not.toContain("Design center")
    expect(html).not.toContain("My Saved")
    expect(html).not.toContain('href="/saved"')
    expect(html).not.toContain("Materials library")
    expect(html).not.toContain("Account overview")
    expect(html).not.toContain(">Trends<")
    expect(html).not.toContain('href="/studio"')
  })
})
