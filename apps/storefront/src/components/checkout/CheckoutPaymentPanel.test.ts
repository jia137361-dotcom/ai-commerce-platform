import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { CheckoutPaymentPanel } from "./CheckoutPaymentPanel"

describe("CheckoutPaymentPanel", () => {
  it("states the authorization-only boundary without claiming Stripe payment", () => {
    const html = renderToStaticMarkup(createElement(CheckoutPaymentPanel))
    expect(html).toContain("pp_system_default")
    expect(html).toContain("does not collect card details")
    expect(html).not.toContain("Card number")
    expect(html).not.toContain("Payment captured")
  })

  it("does not render a fake Stripe form without client_secret", () => {
    const html = renderToStaticMarkup(createElement(CheckoutPaymentPanel, {
      providers: [{ id: "pp_stripe_stripe", isStripe: true }],
      selectedProviderId: "pp_stripe_stripe",
      stripePublishableKey: "pk_test_example",
    }))
    expect(html).toContain("after Medusa returns a valid payment")
    expect(html).not.toContain("Pay with Stripe")
  })
})
