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
    expect(html).toContain("Profile")
    expect(html).toContain("Addresses")
    expect(html).toContain("Account security")
    expect(html).toContain("Switch account")
    expect(html).toContain("Log out")
    expect(html).not.toContain("Orders")
    expect(html).not.toContain("Messages")
  })

  it("moves Messages out of the feature menu", () => {
    const html = renderToStaticMarkup(createElement(FeatureMenuPanel))

    expect(html).toContain("AI design")
    expect(html).toContain("My Saved")
    expect(html).toContain("Orders")
    expect(html).toContain("Support center")
    expect(html).not.toContain("Messages")
  })
})
