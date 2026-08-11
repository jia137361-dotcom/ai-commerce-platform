import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import {
  AboutContent,
  CookiesContent,
  HelpContent,
  PrivacyContent,
  StaticPageNavigation,
  TermsContent,
} from "./StaticInfoContent"

describe("buyer static information pages", () => {
  it("renders help topics from Getting Started / Support Center", () => {
    const html = renderToStaticMarkup(createElement(HelpContent))

    expect(html).toContain("Create an Account")
    expect(html).toContain("Generate AI Images")
    expect(html).toContain("Cancel an Order")
    expect(html).toContain("Refund Policy")
    expect(html).toContain("AI Prompt Guide")
    expect(html).toContain("support@ciiverse.com")
  })

  it("renders official terms sections without inventing capture wording", () => {
    const html = renderToStaticMarkup(createElement(TermsContent))

    expect(html).toContain("Acceptance of Terms")
    expect(html).toContain("Orders and Payments")
    expect(html).toContain("Citigoo Limited")
    expect(html).toContain("Hong Kong")
    expect(html).not.toContain("Payment captured")
    expect(html).not.toContain("Guaranteed refund")
  })

  it("renders official privacy policy sections", () => {
    const html = renderToStaticMarkup(createElement(PrivacyContent))

    expect(html).toContain("Information We Collect")
    expect(html).toContain("AI Image Generation and Processing")
    expect(html).toContain("Payment Processing")
    expect(html).toContain("Cookies and Tracking Technologies")
    expect(html).toContain("privacy@ciiverse.com")
  })

  it("renders about and cookie policy pages", () => {
    const about = renderToStaticMarkup(createElement(AboutContent))
    const cookies = renderToStaticMarkup(createElement(CookiesContent))

    expect(about).toContain("AI-native print-on-demand")
    expect(about).toContain("Hong Kong")
    expect(cookies).toContain("Strictly Necessary Cookies")
    expect(cookies).toContain("Withdrawal of Consent")
  })

  it("includes store and legal navigation actions", () => {
    const html = renderToStaticMarkup(createElement(StaticPageNavigation))

    expect(html).toContain('href="/store"')
    expect(html).toContain('href="/help"')
    expect(html).toContain('href="/about"')
    expect(html).toContain('href="/terms"')
    expect(html).toContain('href="/privacy"')
    expect(html).toContain('href="/cookies"')
  })
})
