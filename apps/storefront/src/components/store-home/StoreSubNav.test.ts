import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { StoreSubNav } from "./StoreSubNav"

jest.mock("../../lib/locale", () => ({
  useBuyerLocale: () => ({
    t: (key: string) => ({
      navAiDesign: "AI design",
      navHowItWorks: "How it works",
    })[key] ?? key,
  }),
}))

describe("StoreSubNav", () => {
  it("does not expose the standalone Product selection workflow", () => {
    const html = renderToStaticMarkup(createElement(StoreSubNav, { storeHref: "/store" }))

    expect(html).toContain('href="/store"')
    expect(html).toContain("AI design")
    expect(html).toContain("My Designs")
    expect(html).not.toContain("Product selection")
    expect(html).not.toContain('href="/trends"')
  })
})
