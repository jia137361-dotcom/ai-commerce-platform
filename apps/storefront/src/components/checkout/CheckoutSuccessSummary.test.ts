import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { CheckoutSuccessSummary } from "./CheckoutSuccessSummary"

describe("CheckoutSuccessSummary", () => {
  it("renders real order identifiers with authorize-only wording", () => {
    const html = renderToStaticMarkup(createElement(CheckoutSuccessSummary, { info: { orderId: "order_123", displayId: "88", total: 21.25, currencyCode: "usd" }, isAuthenticated: true }))
    expect(html).toContain("#88")
    expect(html).toContain("order is confirmed")
    expect(html).toContain("not captured")
    expect(html).not.toContain("Payment captured")
    expect(html).not.toContain("Refund available")
  })
})
