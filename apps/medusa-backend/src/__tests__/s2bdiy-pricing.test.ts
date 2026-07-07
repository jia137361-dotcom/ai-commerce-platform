import {
  calculateS2bdiyRecommendedUsdPrice,
  getDefaultS2bdiyMarkupMultiplier,
} from "../lib/s2bdiy/pricing"

describe("S2BDIY pricing helper", () => {
  const oldEnv = process.env

  beforeEach(() => {
    process.env = { ...oldEnv }
    delete process.env.S2BDIY_CNY_USD_EXCHANGE_RATE
    delete process.env.S2BDIY_PRICE_MULTIPLIER
  })

  afterAll(() => {
    process.env = oldEnv
  })

  it("matches the requested low-cost example", () => {
    expect(
      calculateS2bdiyRecommendedUsdPrice({
        costCny: 20,
        exchangeRate: 6.77,
        multiplier: 2.3,
      }).recommendedPriceUsd
    ).toBe(6.79)
  })

  it("matches the requested high-cost example", () => {
    expect(
      calculateS2bdiyRecommendedUsdPrice({
        costCny: 40,
        exchangeRate: 6.77,
        multiplier: 3,
      }).recommendedPriceUsd
    ).toBe(17.73)
  })

  it("adds shipping converted to USD plus two percent", () => {
    expect(
      calculateS2bdiyRecommendedUsdPrice({
        costCny: 20,
        shippingCny: 10,
        exchangeRate: 6.77,
        multiplier: 2.3,
      })
    ).toMatchObject({
      costUsd: 2.95,
      shippingUsd: 1.51,
      recommendedPriceUsd: 8.3,
    })
  })

  it("uses a cost-based default multiplier", () => {
    expect(getDefaultS2bdiyMarkupMultiplier(20)).toBe(2.3)
    expect(getDefaultS2bdiyMarkupMultiplier(30)).toBe(2.65)
    expect(getDefaultS2bdiyMarkupMultiplier(40)).toBe(3)
  })
})
