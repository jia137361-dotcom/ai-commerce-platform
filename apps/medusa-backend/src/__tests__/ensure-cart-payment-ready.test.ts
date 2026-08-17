const mockSyncCartCheckoutPricing = jest.fn()

jest.mock("../lib/sync-cart-checkout-pricing", () => ({
  syncCartCheckoutPricing: (...args: unknown[]) => mockSyncCartCheckoutPricing(...args),
}))

import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { ensureCartPaymentReady, selectPaymentSessionForProvider } from "../lib/ensure-cart-payment-ready"

describe("selectPaymentSessionForProvider", () => {
  beforeEach(() => jest.clearAllMocks())

  it("prefers a processable payment session over an older canceled session", () => {
    expect(selectPaymentSessionForProvider([
      { id: "ps_cancelled", provider_id: "pp_stripe_stripe", status: "canceled" },
      { id: "ps_ready", provider_id: "pp_stripe_stripe", status: "pending" },
    ], "pp_stripe_stripe")).toMatchObject({ id: "ps_ready" })
  })

  it("synchronizes canonical pricing before reusing a payment session", async () => {
    const graph = jest.fn()
      .mockResolvedValueOnce({ data: [{ id: "cart_1", payment_collection: { id: "pay_col_1" } }] })
      .mockResolvedValueOnce({ data: [{ id: "ps_ready", provider_id: "pp_stripe_stripe", status: "pending" }] })
    const container = {
      resolve: (key: string) => {
        if (key === Modules.LOCKING) {
          return { execute: (_key: string, job: () => Promise<unknown>) => job() }
        }
        if (key === ContainerRegistrationKeys.QUERY) return { graph }
        if (key === Modules.CART) return {}
        throw new Error(`Unexpected dependency: ${key}`)
      },
    }
    mockSyncCartCheckoutPricing.mockResolvedValue({ payableTotal: 180.44, currencyCode: "hkd" })

    await ensureCartPaymentReady(container as never, "cart_1", "pp_stripe_stripe")

    expect(mockSyncCartCheckoutPricing).toHaveBeenCalledWith(container, "cart_1")
  })
})
