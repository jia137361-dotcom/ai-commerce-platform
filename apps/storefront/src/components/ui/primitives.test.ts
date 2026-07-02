import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { Button } from "./Button"
import { MoneyText } from "./MoneyText"
import { StatusBadge } from "./StatusBadge"

describe("buyer UI primitives", () => {
  it.each(["primary", "secondary", "danger", "ghost"] as const)(
    "renders the %s button variant",
    (variant) => {
      const html = renderToStaticMarkup(
        createElement(Button, { variant }, "Action")
      )
      expect(html).toContain(`buyer-ui-button--${variant}`)
      expect(html).toContain("Action")
    }
  )

  it("renders status text without changing its meaning", () => {
    const html = renderToStaticMarkup(
      createElement(StatusBadge, { tone: "warning" }, "authorized")
    )
    expect(html).toContain("authorized")
    expect(html).toContain("buyer-ui-status--warning")
  })

  it("renders unavailable money without converting null to zero", () => {
    const html = renderToStaticMarkup(
      createElement(MoneyText, { amount: null, currencyCode: "usd" })
    )
    expect(html).toContain("Not available")
    expect(html).not.toContain("$0.00")
  })

  it("formats a real amount with the requested currency", () => {
    const html = renderToStaticMarkup(
      createElement(MoneyText, { amount: 21.25, currencyCode: "usd" })
    )
    expect(html).toContain("$21.25")
  })
})
