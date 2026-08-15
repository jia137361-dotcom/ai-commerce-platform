import {
  formatStripeConnectSetupError,
  isConnectAccountReady,
  maskStripeAccountId,
  resolveSellerStripeConnectStatus,
} from "../lib/seller-stripe-connect"

jest.mock("../lib/stripe-client", () => ({
  isStripeConfigured: jest.fn(() => true),
  isStripeResourceNotFoundError: jest.fn(
    (error) =>
      error?.status === 404 ||
      error?.stripeCode === "resource_missing" ||
      error?.stripeCode === "account_invalid"
  ),
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
        country: "HK",
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
      })
      .mockResolvedValueOnce({ id: "acct_platform", country: "HK" })
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

  it("requires a same-country account for platform transfers", async () => {
    ;(stripeApiRequest as jest.Mock)
      .mockResolvedValueOnce({
        id: "acct_seller",
        country: "US",
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
      })
      .mockResolvedValueOnce({ id: "acct_platform", country: "HK" })

    const status = await resolveSellerStripeConnectStatus("acct_seller")

    expect(status.connected).toBe(false)
    expect(status.country_mismatch).toBe(true)
    expect(status.account_country).toBe("US")
    expect(status.platform_country).toBe("HK")
  })

  it("allows the seller to recover when the stored Connect account was deleted", async () => {
    ;(stripeApiRequest as jest.Mock).mockRejectedValueOnce(
      Object.assign(new Error("Account access was revoked"), { status: 400, stripeCode: "account_invalid" })
    )

    const status = await resolveSellerStripeConnectStatus("acct_deleted")

    expect(status.connected).toBe(false)
    expect(status.account_missing).toBe(true)
    expect(status.onboarding_required).toBe(true)
  })
})
