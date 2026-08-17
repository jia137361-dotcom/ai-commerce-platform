import { STORE_CORE_MODULE } from "../modules/store-core"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { releaseSellerPayout } from "../lib/seller-order-payout"

jest.mock("../lib/stripe-client", () => ({
  isStripeConfigured: jest.fn(() => true),
  stripeApiRequest: jest.fn(),
}))

jest.mock("../lib/seller-stripe-connect", () => ({
  retrieveConnectAccount: jest.fn(),
  isConnectAccountReady: jest.fn(),
}))

import { isStripeConfigured, stripeApiRequest } from "../lib/stripe-client"
import { isConnectAccountReady, retrieveConnectAccount } from "../lib/seller-stripe-connect"

const paidStripeOrder = {
  id: "order_1",
  display_id: 8,
  currency_code: "usd",
  total: 29.99,
  metadata: { store_id: "default_store", payment_status: "paid" },
  payment_collections: [{
    status: "completed",
    captured_amount: 29.99,
    currency_code: "usd",
    payments: [{ status: "captured", captured_at: "2026-06-24T00:00:00.000Z", amount: 29.99 }],
    payment_sessions: [{ provider_id: "pp_stripe_stripe", status: "captured", data: { id: "pi_123" } }],
  }],
}

const createScope = (order: Record<string, unknown>, store: Record<string, unknown>) => {
  const updateOrders = jest.fn(async () => undefined)
  return {
    scope: {
      resolve: (key: string) => {
        if (key === ContainerRegistrationKeys.QUERY) {
          return { graph: jest.fn(async () => ({ data: [order] })) }
        }
        if (key === STORE_CORE_MODULE) {
          return {
            listStores: jest.fn(async () => [store]),
            createStoreNotifications: jest.fn(async () => undefined),
          }
        }
        if (key === Modules.ORDER) {
          return { updateOrders, listOrders: jest.fn(async () => []) }
        }
        throw new Error(`Unexpected resolve key: ${key}`)
      },
    },
    updateOrders,
  }
}

describe("releaseSellerPayout", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(isStripeConfigured as jest.Mock).mockReturnValue(true)
    ;(isConnectAccountReady as jest.Mock).mockReturnValue(true)
    ;(retrieveConnectAccount as jest.Mock).mockResolvedValue({
      id: "acct_seller",
      charges_enabled: true,
      payouts_enabled: true,
      details_submitted: true,
    })
    ;(stripeApiRequest as jest.Mock).mockImplementation((path: string) => {
      if (path === "/payment_intents/pi_123") return Promise.resolve({ latest_charge: "ch_123" })
      if (path === "/charges/ch_123") return Promise.resolve({ balance_transaction: "txn_123" })
      if (path === "/balance_transactions/txn_123") return Promise.resolve({ amount: 2999, currency: "usd" })
      return Promise.resolve({ id: "tr_123" })
    })
  })

  it("transfers captured funds to the seller connect account on receipt confirmation", async () => {
    const { scope } = createScope(paidStripeOrder, {
      id: "default_store",
      stripe_account_id: "acct_seller",
    })

    const result = await releaseSellerPayout(scope as never, "order_1", "buyer_confirm")
    expect(result.status).toBe("completed")
    expect(result.transfer_id).toBe("tr_123")
    expect(result.amount).toBe(29.99)
    expect(stripeApiRequest).toHaveBeenCalledWith(
      "/transfers",
      expect.objectContaining({
        method: "POST",
        params: expect.objectContaining({
          amount: 2999,
          currency: "usd",
          destination: "acct_seller",
          source_transaction: "ch_123",
          transfer_group: "order_order_1",
        }),
      })
    )
  })

  it("marks payout as pending when seller has not connected Stripe yet", async () => {
    const { scope, updateOrders } = createScope(paidStripeOrder, {
      id: "default_store",
      stripe_account_id: null,
    })

    const result = await releaseSellerPayout(scope as never, "order_1", "buyer_confirm")
    expect(result.status).toBe("pending_account")
    expect(stripeApiRequest).not.toHaveBeenCalled()
    expect(updateOrders).toHaveBeenCalled()
  })
})
