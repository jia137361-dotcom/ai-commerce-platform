import { calculateWalletBalances, isHongKongSettlementDay } from "../lib/buyer-wallet"
import { convertWalletAmount, majorToMinor, minorToMajor } from "../lib/wallet-currency"

describe("wallet money", () => {
  it("converts between the fixed development FX currencies", () => {
    expect(convertWalletAmount(1, "usd", "hkd")).toBe(7.8)
    expect(convertWalletAmount(7.8, "hkd", "usd")).toBe(1)
  })

  it("uses currency minor units", () => {
    expect(majorToMinor(1.23, "hkd")).toBe(123)
    expect(majorToMinor(123, "jpy")).toBe(123)
    expect(minorToMajor(123, "hkd")).toBe(1.23)
  })

  it("holds processing withdrawals and releases failed withdrawals", () => {
    const credit = { type: "cashback_credit", status: "available", currency_code: "hkd", amount_minor: 500 }
    expect(calculateWalletBalances([credit, { type: "withdrawal_debit", status: "processing", currency_code: "hkd", amount_minor: 200 }])).toEqual({ hkd: 300 })
    expect(calculateWalletBalances([credit, { type: "withdrawal_debit", status: "failed", currency_code: "hkd", amount_minor: 200 }])).toEqual({ hkd: 500 })
  })

  it("uses Hong Kong time for the monthly settlement day", () => {
    expect(isHongKongSettlementDay(new Date("2026-08-19T16:00:00.000Z"))).toBe(true)
    expect(isHongKongSettlementDay(new Date("2026-08-20T15:59:59.000Z"))).toBe(true)
    expect(isHongKongSettlementDay(new Date("2026-08-20T16:00:00.000Z"))).toBe(false)
  })
})
