import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { CheckoutPageStatus } from "./CheckoutPageStatus"
import { CheckoutCompleteError } from "./CheckoutCompleteError"

describe("checkout status components", () => {
  it("renders empty checkout", () => expect(renderToStaticMarkup(createElement(CheckoutPageStatus, { loading: false, empty: true, onRetry: () => undefined }))).toContain("Your cart is empty"))
  it("renders complete failure as ErrorState", () => {
    const html = renderToStaticMarkup(createElement(CheckoutCompleteError, { message: "Complete failed" }))
    expect(html).toContain("buyer-ui-error")
    expect(html).toContain("Complete failed")
  })
})
