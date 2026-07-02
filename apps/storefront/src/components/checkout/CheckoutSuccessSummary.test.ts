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
    const html = renderToStaticMarkup(createElement(CheckoutSuccessSummary, {
      info: {
        orderId: "order_123",
        paymentProviderId: "pp_stripe_stripe",
        paymentMethodLabel: "VISA ···· 4242",
        paymentStatus: "captured",
      },
    }))
    expect(html).toContain("Stripe · captured")
    expect(html).toContain("Payment method")
    expect(html).toContain("VISA ···· 4242")
    expect(html).not.toContain("pp_stripe_stripe")
    expect(html).not.toContain("client_secret")
  })
})
