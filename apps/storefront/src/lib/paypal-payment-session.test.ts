import { isPayPalProviderOrderId, readPayPalOrderId } from "./paypal-payment-session"

describe("PayPal payment session mapping", () => {
  it("never treats a Medusa payment session id as a PayPal Order id", () => {
    expect(isPayPalProviderOrderId("payses_01H_TEST")).toBe(false)
    expect(readPayPalOrderId("pp_paypal_paypal", { id: "payses_01H_TEST" })).toBeUndefined()
  })

  it("uses only provider Order identifiers from PayPal session data", () => {
    expect(readPayPalOrderId("pp_paypal_paypal", { paypal_order_id: "PAYPAL_ORDER_123" })).toBe("PAYPAL_ORDER_123")
    expect(readPayPalOrderId("pp_paypal_paypal", { id: "PAYPAL_ORDER_456" })).toBe("PAYPAL_ORDER_456")
  })
})
