import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { CheckoutPaymentPanel, describeStripeReadiness, shouldChangePaymentProvider } from "./CheckoutPaymentPanel"

jest.mock("./StripePaymentForm", () => ({
  StripePaymentForm: () => null,
}))

describe("CheckoutPaymentPanel", () => {
  it("shows Card and PayPal choices without claiming Stripe payment", () => {
    const html = renderToStaticMarkup(createElement(CheckoutPaymentPanel, {
      providers: [
        { id: "pp_system_default", isStripe: false },
        { id: "pp_stripe_stripe", isStripe: true },
        { id: "pp_paypal_paypal", isStripe: false, isPayPal: true },
      ],
      selectedProviderId: "pp_stripe_stripe",
    }))
    expect(html).not.toContain("pp_system_default")
    expect(html.match(/>Card</g)).toHaveLength(1)
    expect(html.match(/>PayPal</g)).toHaveLength(1)
    expect(html).toContain("PayPal")
    expect(html).not.toContain("Card number")
    expect(html).not.toContain("Payment captured")
  })

  it("does not render a fake Stripe form without client_secret", () => {
    const html = renderToStaticMarkup(createElement(CheckoutPaymentPanel, {
      providers: [{ id: "pp_stripe_stripe", isStripe: true }],
      selectedProviderId: "pp_stripe_stripe",
      stripePublishableKey: "pk_test_example",
    }))
    expect(html).toContain("Preparing secure payment")
    expect(html).not.toContain("Pay with Stripe")
  })

  it("does not treat clicking the already-selected payment provider as a provider change", () => {
    expect(shouldChangePaymentProvider("pp_stripe_stripe", "pp_stripe_stripe")).toBe(false)
    expect(shouldChangePaymentProvider("pp_system_default", "pp_stripe_stripe")).toBe(true)
  })

  it("shows preparing instead of setup required while Stripe session initialization is in flight", () => {
    const html = renderToStaticMarkup(createElement(CheckoutPaymentPanel, {
      providers: [{ id: "pp_stripe_stripe", isStripe: true }],
      selectedProviderId: "pp_stripe_stripe",
      stripePublishableKey: "pk_test_example",
      preparing: true,
    }))

    expect(html).toContain("Preparing")
    expect(html).not.toContain("Setup required")
  })

  it("does not call a client secret alone a ready card form", () => {
    expect(describeStripeReadiness({
      usingSavedMethod: false,
      preparing: false,
      hasClientSecret: true,
      lifecycle: "stripe_js_ready",
    })).toBe("Loading secure card form")
    expect(describeStripeReadiness({
      usingSavedMethod: false,
      preparing: false,
      hasClientSecret: true,
      lifecycle: "payment_element_ready",
    })).toBe("Card form ready")
  })

  it("reports a Stripe.js or Payment Element failure instead of a ready state", () => {
    expect(describeStripeReadiness({
      usingSavedMethod: false,
      preparing: false,
      hasClientSecret: true,
      lifecycle: "stripe_js_error",
    })).toBe("Unable to load Stripe")
    expect(describeStripeReadiness({
      usingSavedMethod: false,
      preparing: false,
      hasClientSecret: true,
      lifecycle: "payment_element_error",
    })).toBe("Unable to load Stripe")
  })
})
