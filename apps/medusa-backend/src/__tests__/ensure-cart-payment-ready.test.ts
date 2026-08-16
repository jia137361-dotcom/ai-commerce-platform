import { selectPaymentSessionForProvider } from "../lib/ensure-cart-payment-ready"

describe("selectPaymentSessionForProvider", () => {
  it("prefers a processable payment session over an older canceled session", () => {
    expect(selectPaymentSessionForProvider([
      { id: "ps_cancelled", provider_id: "pp_stripe_stripe", status: "canceled" },
      { id: "ps_ready", provider_id: "pp_stripe_stripe", status: "pending" },
    ], "pp_stripe_stripe")).toMatchObject({ id: "ps_ready" })
  })
})
