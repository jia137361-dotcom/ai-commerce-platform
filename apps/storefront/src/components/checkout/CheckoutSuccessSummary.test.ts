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

  it("shows backend Stripe status without exposing payment secrets", () => {
    const html = renderToStaticMarkup(createElement(CheckoutSuccessSummary, { info: { orderId: "order_123", paymentProviderId: "pp_stripe_stripe", paymentStatus: "captured" } }))
    expect(html).toContain("Stripe · captured")
    expect(html).not.toContain("client_secret")
    expect(html).not.toContain("sk_test_")
    expect(html).not.toContain("whsec_")
  })
})
