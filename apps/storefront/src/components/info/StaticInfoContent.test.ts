import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import {
  HelpContent,
  PrivacyContent,
  StaticPageNavigation,
  TermsContent,
} from "./StaticInfoContent"

describe("buyer static information pages", () => {
  it("renders help center categories and article links", () => {
    const html = renderToStaticMarkup(createElement(HelpContent))

    expect(html).toContain("Getting Started")
    expect(html).toContain("Order Management")
    expect(html).toContain("Payments &amp; Billing")
    expect(html).toContain("Copyright &amp; Legal")
    expect(html).toContain('href="/help/create-account"')
    expect(html).toContain('href="/help/refund-policy"')
    expect(html).toContain('href="/help/cookie-policy"')
  })

  it("does not claim captured or refunded payment in the terms", () => {
    const html = renderToStaticMarkup(createElement(TermsContent))

    expect(html).toContain("Payment authorization")
    expect(html).toContain("pending review")
    expect(html).not.toContain("Payment captured")
    expect(html).not.toContain("Money paid")
    expect(html).not.toContain("Refunded")
    expect(html).not.toContain("Money returned")
    expect(html).not.toContain("Guaranteed refund")
  })

  it("renders account, cart, order, guest lookup, and data-separation privacy sections", () => {
    const html = renderToStaticMarkup(createElement(PrivacyContent))

    expect(html).toContain("Account data")
    expect(html).toContain("Cart data")
    expect(html).toContain("Order data")
    expect(html).toContain("Guest lookup data")
    expect(html).toContain("Seller and admin data separation")
  })

  it("includes store, account, and order navigation actions", () => {
    const html = renderToStaticMarkup(createElement(StaticPageNavigation))

    expect(html).toContain('href="/store"')
    expect(html).toContain('href="/account"')
    expect(html).toContain('href="/account/orders"')
  })
})
