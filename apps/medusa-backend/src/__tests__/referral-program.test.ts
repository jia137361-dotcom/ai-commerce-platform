import {
  calculateEligibleReferralAmount,
  calculateReferralCommissionUsd,
  normalizeReferralCode,
  REFERRAL_PROGRAM_RULES,
  releaseReferralCommissionForOrder,
  cancelReferralCommissionForOrder,
} from "../lib/referral-program"
import { Modules } from "@medusajs/framework/utils"
import { STORE_CORE_MODULE } from "../modules/store-core"
import { BUYER_REFUND_REQUESTS_MODULE } from "../modules/buyer-refund-requests"

describe("referral program rules", () => {
  it("normalizes a shared referral code", () => {
    expect(normalizeReferralCode(" cii-12 ab! ")).toBe("CII12AB")
  })

  it("excludes discounts, shipping, tax, import and export fees", () => {
    const eligible = calculateEligibleReferralAmount({
      currency_code: "usd",
      items: [{ unit_price: 60, quantity: 1 }, { unit_price: 20, quantity: 2 }],
      discount_total: 10,
      shipping_total: 12,
      tax_total: 5,
      total: 105,
      metadata: { import_fee: 2, export_fee: 1 },
    })
    expect(eligible).toBe(87)
  })

  it("uses 25% for the first order and 8% for future orders in USD", () => {
    expect(calculateReferralCommissionUsd({
      eligibleAmount: 100,
      orderCurrencyCode: "usd",
      rateBps: REFERRAL_PROGRAM_RULES.firstOrderRateBps,
    })).toEqual({ eligibleAmountMinor: 10_000, commissionAmountMinor: 2_500 })

    expect(calculateReferralCommissionUsd({
      eligibleAmount: 100,
      orderCurrencyCode: "usd",
      rateBps: REFERRAL_PROGRAM_RULES.futureOrderRateBps,
    })).toEqual({ eligibleAmountMinor: 10_000, commissionAmountMinor: 800 })
  })

  it("converts the eligible value to USD before applying the rate", () => {
    expect(calculateReferralCommissionUsd({
      eligibleAmount: 780,
      orderCurrencyCode: "hkd",
      rateBps: REFERRAL_PROGRAM_RULES.firstOrderRateBps,
    })).toEqual({ eligibleAmountMinor: 10_000, commissionAmountMinor: 2_500 })
  })

  it("releases a completed order to the wallet and reverses it after a refund", async () => {
    const attribution = {
      id: "rfa_1",
      status: "active",
      referrer_customer_id: "cus_referrer",
      first_successful_order_at: null,
      expires_at: null,
    }
    const commission: Record<string, any> = {
      id: "rfc_1",
      store_id: "store_1",
      attribution_id: attribution.id,
      referrer_customer_id: "cus_referrer",
      referred_customer_id: "cus_buyer",
      order_id: "order_1",
      order_display_id: 101,
      order_created_at: new Date("2026-08-01T00:00:00.000Z"),
      eligible_amount_minor: 10_000,
      commission_amount_minor: 2_500,
      rate_bps: 2_500,
      status: "pending",
      metadata: {},
    }
    const ledger: Array<Record<string, any>> = []
    const storeCore = {
      listReferralCommissions: jest.fn(async (filters: Record<string, unknown>) => {
        if (filters.order_id && filters.order_id !== commission.order_id) return []
        return [commission]
      }),
      listReferralAttributions: jest.fn(async () => [attribution]),
      updateReferralCommissions: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        Object.assign(commission, data)
        return [commission]
      }),
      updateReferralAttributions: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        Object.assign(attribution, data)
        return [attribution]
      }),
      listBuyerWalletLedgers: jest.fn(async (filters: Record<string, unknown>) => ledger.filter((row) => row.reference_id === filters.reference_id && row.type === filters.type)),
      createBuyerWalletLedgers: jest.fn(async (input: Record<string, unknown>) => {
        const row = { id: `bwl_${ledger.length + 1}`, ...input }
        ledger.push(row)
        return [row]
      }),
    }
    const order = {
      id: "order_1",
      status: "completed",
      customer_id: "cus_buyer",
      currency_code: "usd",
      metadata: { store_id: "store_1" },
      items: [{ unit_price: 100, quantity: 1 }],
      discount_total: 0,
      payment_collections: [],
      created_at: new Date("2026-08-01T00:00:00.000Z"),
    }
    const container = {
      resolve: jest.fn((key: string) => {
        if (key === STORE_CORE_MODULE) return storeCore
        if (key === Modules.ORDER) return { retrieveOrder: jest.fn(async () => order) }
        if (key === BUYER_REFUND_REQUESTS_MODULE) return { listBuyerRefundRequests: jest.fn(async () => []) }
        throw new Error(`Unexpected dependency: ${key}`)
      }),
    } as any

    await releaseReferralCommissionForOrder(container, order.id)
    expect(commission.status).toBe("released")
    expect(commission.commission_amount_minor).toBe(2_500)
    expect(ledger).toEqual(expect.arrayContaining([expect.objectContaining({
      type: "cashback_credit",
      amount_minor: 2_500,
      status: "available",
      reference_id: commission.id,
    })]))

    await cancelReferralCommissionForOrder(container, order.id, "order_refund")
    expect(commission.status).toBe("order_refund")
    expect(commission.commission_amount_minor).toBe(0)
    expect(ledger).toEqual(expect.arrayContaining([expect.objectContaining({
      type: "adjustment",
      amount_minor: -2_500,
      status: "completed",
      reference_id: `${commission.id}:reversal`,
    })]))
  })
})
