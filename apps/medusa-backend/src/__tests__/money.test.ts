import {
  currencyExponent,
  majorToProviderMinor,
  moneyEquals,
  normalizeMajor,
  providerMinorToMajor,
} from "../lib/money"

describe("canonical Medusa money units", () => {
  test("converts HKD major units to provider minor units exactly once", () => {
    expect(normalizeMajor(180.44, "hkd")).toBe(180.44)
    expect(majorToProviderMinor(180.44, "hkd")).toBe(18044)
    expect(providerMinorToMajor(18044, "hkd")).toBe(180.44)
  })

  test("supports zero- and three-decimal currencies", () => {
    expect(currencyExponent("jpy")).toBe(0)
    expect(currencyExponent("kwd")).toBe(3)
    expect(majorToProviderMinor(123, "jpy")).toBe(123)
    expect(majorToProviderMinor(1.234, "kwd")).toBe(1234)
  })

  test("compares amounts at the currency precision", () => {
    expect(moneyEquals(180.44, 180.4400001, "hkd")).toBe(true)
    expect(moneyEquals(180.44, 180.45, "hkd")).toBe(false)
  })

  test.each([Number.NaN, Number.POSITIVE_INFINITY, -0.01])(
    "rejects invalid major amount %s",
    (amount) => {
      expect(() => normalizeMajor(amount, "hkd")).toThrow("Invalid money amount")
    }
  )
})
