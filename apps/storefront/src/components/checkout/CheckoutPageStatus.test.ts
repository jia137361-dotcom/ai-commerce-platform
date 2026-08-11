import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { CheckoutPageStatus } from "./CheckoutPageStatus"
import { CheckoutCompleteError } from "./CheckoutCompleteError"

describe("checkout status components", () => {
  it("renders empty checkout with My Designs CTA", () => {
    const html = renderToStaticMarkup(
      createElement(CheckoutPageStatus, { loading: false, empty: true, onRetry: () => undefined })
    )
    expect(html).toContain("Your cart is empty")
    expect(html).toContain('href="/my-designs"')
  })
  it("renders complete failure as ErrorState", () => {
    const html = renderToStaticMarkup(createElement(CheckoutCompleteError, { message: "Complete failed" }))
    expect(html).toContain("buyer-ui-error")
    expect(html).toContain("Complete failed")
  })
})
