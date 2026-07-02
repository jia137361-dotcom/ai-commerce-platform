import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import {
  HelpContent,
  PrivacyContent,
  StaticPageNavigation,
  TermsContent,
} from "./StaticInfoContent"

describe("buyer static information pages", () => {
  it("renders help sections for ordering, payment, cancellation, refunds, lookup, and support", () => {
    const html = renderToStaticMarkup(createElement(HelpContent))

    expect(html).toContain("How to order")
    expect(html).toContain("How checkout works")
    expect(html).toContain("Payment authorization")
    expect(html).toContain("Cancel an order")
    expect(html).toContain("Request a refund")
    expect(html).toContain("Guest order lookup")
    expect(html).toContain("Support and contact")
    expect(html).toContain("authorizes payment but does not capture")
    expect(html).toContain("pending review, not money returned")
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
