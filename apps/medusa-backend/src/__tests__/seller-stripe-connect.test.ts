import {
  formatStripeConnectSetupError,
  isConnectAccountReady,
  maskStripeAccountId,
  resolveSellerStripeConnectStatus,
} from "../lib/seller-stripe-connect"

jest.mock("../lib/stripe-client", () => ({
  isStripeConfigured: jest.fn(() => true),
  stripeApiRequest: jest.fn(),
}))

import { isStripeConfigured, stripeApiRequest } from "../lib/stripe-client"

describe("seller stripe connect", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(isStripeConfigured as jest.Mock).mockReturnValue(true)
  })

  it("masks stripe account ids for seller UI", () => {
    expect(maskStripeAccountId("acct_1234567890")).toBe("acct_12…7890")
  })

  it("maps missing Stripe Connect setup to an actionable message", () => {
    expect(
      formatStripeConnectSetupError(
        new Error(
          "You can only create new accounts if you've signed up for Connect, which you can do at https://dashboard.stripe.com/connect."
        )
      )
    ).toContain("Stripe Connect is not enabled")
  })

  it("reports onboarding required when store has no connect account", async () => {
    const status = await resolveSellerStripeConnectStatus(null)
    expect(status.configured).toBe(true)
    expect(status.connected).toBe(false)
    expect(status.onboarding_required).toBe(true)
  })

  it("reports connected when stripe account is payout-ready", async () => {
    ;(stripeApiRequest as jest.Mock)
      .mockResolvedValueOnce({
        id: "acct_seller",
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
      })
      .mockResolvedValueOnce({ url: "https://connect.stripe.com/login" })

    const status = await resolveSellerStripeConnectStatus("acct_seller")
    expect(status.connected).toBe(true)
    expect(isConnectAccountReady({
      id: "acct_seller",
      charges_enabled: true,
      payouts_enabled: true,
      details_submitted: true,
    })).toBe(true)
    expect(status.dashboard_url).toBe("https://connect.stripe.com/login")
  })
})
