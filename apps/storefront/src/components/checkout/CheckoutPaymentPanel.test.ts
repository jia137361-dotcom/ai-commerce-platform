import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { CheckoutPaymentPanel } from "./CheckoutPaymentPanel"

describe("CheckoutPaymentPanel", () => {
  it("states authorize-only system payment without claiming Stripe or capture", () => {
    const html = renderToStaticMarkup(createElement(CheckoutPaymentPanel))
    expect(html).toContain("Authorize only")
    expect(html).toContain("pp_system_default")
    expect(html).toContain("does not capture funds")
    expect(html).not.toContain("Stripe")
    expect(html).not.toContain("Payment captured")
  })
})
