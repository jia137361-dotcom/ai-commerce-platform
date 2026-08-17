import { normalizeMedusaCartMoney } from "./cart-money"

describe("buyer cart major-unit normalization", () => {
  it("keeps Medusa cart amounts in major units", () => {
    expect(normalizeMedusaCartMoney(233.92)).toBe(233.92)
    expect(normalizeMedusaCartMoney("238.92")).toBe(238.92)
  })

  it("returns undefined for unavailable amounts", () => {
    expect(normalizeMedusaCartMoney(null)).toBeUndefined()
    expect(normalizeMedusaCartMoney(Number.NaN)).toBeUndefined()
  })
})
