import { Modules } from "@medusajs/framework/utils"
import { STORE_CORE_MODULE } from "../modules/store-core"
import {
  processMonthlyBuyerWithdrawals,
  requestBuyerWithdrawal,
  updateBuyerWithdrawalByAdmin,
  calculatePayoutUserFeeMinor,
} from "../lib/buyer-wallet"
import { createPayPalPayout } from "../lib/paypal-payouts"

jest.mock("../lib/customer-payment-methods", () => ({
  resolvePayPalPayoutEmailFromMetadata: () => "referrer@example.com",
}))

jest.mock("../lib/paypal-payouts", () => ({
  createPayPalPayout: jest.fn(async ({ withdrawalId }: { withdrawalId: string }) => ({
    mode: "mock",
    batchId: `batch_${withdrawalId}`,
    itemId: `item_${withdrawalId}`,
    feeMinor: 8,
    feeCurrency: "usd",
    status: "paid",
  })),
  maskPayoutEmail: () => "re******@example.com",
  resolvePayPalPayoutMode: () => "mock",
  retrievePayPalPayout: jest.fn(),
}))

describe("buyer wallet monthly withdrawals", () => {
  it("deducts the configured 2% user fee with the USD 50 cap", () => {
    expect(calculatePayoutUserFeeMinor(500)).toBe(10)
    expect(calculatePayoutUserFeeMinor(1_000_000)).toBe(5_000)
  })

  it("queues, approves, and pays a USD withdrawal on the settlement run", async () => {
    const withdrawals: Array<Record<string, any>> = []
    const ledger: Array<Record<string, any>> = [{
      id: "bwl_credit",
      store_id: "store_1",
      customer_id: "cus_1",
      type: "cashback_credit",
      amount_minor: 1_000,
      currency_code: "usd",
      status: "available",
      source: "referral_commission",
      reference_id: "rfc_1",
      created_at: new Date(),
    }]
    const matches = (row: Record<string, any>, filters: Record<string, unknown>) =>
      Object.entries(filters).every(([key, value]) => row[key] === value)
    const service = {
      listBuyerWalletWithdrawals: jest.fn(async (filters: Record<string, unknown>) => withdrawals.filter((row) => matches(row, filters))),
      createBuyerWalletWithdrawals: jest.fn(async (input: Record<string, unknown>) => {
        const row = { id: "bww_1", created_at: new Date(), updated_at: new Date(), ...input }
        withdrawals.push(row)
        return [row]
      }),
      updateBuyerWalletWithdrawals: jest.fn(async ({ selector, data }: { selector: Record<string, unknown>; data: Record<string, unknown> }) => {
        const row = withdrawals.find((candidate) => matches(candidate, selector))!
        Object.assign(row, data, { updated_at: new Date() })
        return [row]
      }),
      listBuyerWalletLedgers: jest.fn(async (filters: Record<string, unknown>) => ledger.filter((row) => matches(row, filters))),
      createBuyerWalletLedgers: jest.fn(async (input: Record<string, unknown>) => {
        const row = { id: `bwl_${ledger.length + 1}`, created_at: new Date(), ...input }
        ledger.push(row)
        return [row]
      }),
      updateBuyerWalletLedgers: jest.fn(async ({ selector, data }: { selector: Record<string, unknown>; data: Record<string, unknown> }) => {
        const row = ledger.find((candidate) => matches(candidate, selector))!
        Object.assign(row, data)
        return [row]
      }),
    }
    const container = {
      resolve: jest.fn((key: string) => {
        if (key === STORE_CORE_MODULE) return service
        if (key === Modules.LOCKING) return { execute: async (_key: string, job: () => Promise<unknown>) => job() }
        if (key === Modules.CUSTOMER) return { retrieveCustomer: async () => ({ id: "cus_1", metadata: {} }) }
        throw new Error(`Unexpected dependency: ${key}`)
      }),
    } as any

    const requested = await requestBuyerWithdrawal(container, {
      storeId: "store_1",
      customerId: "cus_1",
      amount: 5,
      currencyCode: "usd",
      requestId: "request_12345678",
    })
    expect(requested.withdrawal.status).toBe("pending")
    expect(requested.withdrawal.payout_amount_minor).toBe(490)
    expect(requested.withdrawal.fee_minor).toBe(10)
    expect(createPayPalPayout).not.toHaveBeenCalled()
    expect(ledger.find((row) => row.type === "withdrawal_debit")?.status).toBe("processing")

    const approved = await updateBuyerWithdrawalByAdmin(container, {
      storeId: "store_1",
      withdrawalId: "bww_1",
      action: "approve",
    })
    expect(approved.status).toBe("approved")

    const settlement = await processMonthlyBuyerWithdrawals(container, { force: true })
    expect(settlement.processed).toBe(1)
    expect(withdrawals[0].status).toBe("paid")
    expect(withdrawals[0].fee_minor).toBe(8)
    expect(ledger.find((row) => row.type === "withdrawal_debit")?.status).toBe("completed")
    expect(ledger).toEqual(expect.arrayContaining([expect.objectContaining({
      type: "adjustment",
      amount_minor: 2,
      source: "paypal_payout_fee_reconciliation",
    })]))
    expect(createPayPalPayout).toHaveBeenCalledWith(expect.objectContaining({
      receiverEmail: "referrer@example.com",
      amountMinor: 490,
      currencyCode: "usd",
    }))
  })
})
