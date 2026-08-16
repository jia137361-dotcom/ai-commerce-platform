import {
  maskPayPalMerchantId,
  resolvePlatformPayPalBusinessStatus,
} from "../lib/platform-paypal-business"

describe("platform PayPal Business status", () => {
  const originalEnvironment = process.env.PAYPAL_ENVIRONMENT
  const originalClientId = process.env.PAYPAL_CLIENT_ID
  const originalClientSecret = process.env.PAYPAL_CLIENT_SECRET
  const originalMerchantId = process.env.PAYPAL_MERCHANT_ID

  afterEach(() => {
    process.env.PAYPAL_ENVIRONMENT = originalEnvironment
    process.env.PAYPAL_CLIENT_ID = originalClientId
    process.env.PAYPAL_CLIENT_SECRET = originalClientSecret
    process.env.PAYPAL_MERCHANT_ID = originalMerchantId
  })

  it("reports the configured Sandbox Business account without exposing credentials", () => {
    process.env.PAYPAL_ENVIRONMENT = "sandbox"
    process.env.PAYPAL_CLIENT_ID = "sandbox-client-id"
    process.env.PAYPAL_CLIENT_SECRET = "sandbox-client-secret"
    process.env.PAYPAL_MERCHANT_ID = "UKPNG4XMRNF4C"

    expect(resolvePlatformPayPalBusinessStatus()).toEqual({
      configured: true,
      environment: "sandbox",
      merchant_id: "UKPN...NF4C",
      dashboard_url: "https://www.sandbox.paypal.com/myaccount/summary",
    })
  })

  it("does not mark partial configuration as a receiving account", () => {
    process.env.PAYPAL_ENVIRONMENT = "sandbox"
    process.env.PAYPAL_CLIENT_ID = "sandbox-client-id"
    delete process.env.PAYPAL_CLIENT_SECRET

    expect(resolvePlatformPayPalBusinessStatus().configured).toBe(false)
  })

  it("masks merchant identifiers in the seller response", () => {
    expect(maskPayPalMerchantId("UKPNG4XMRNF4C")).toBe("UKPN...NF4C")
  })
})
