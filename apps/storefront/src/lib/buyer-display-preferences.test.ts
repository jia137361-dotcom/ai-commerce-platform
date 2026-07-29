import { convertDisplayAmount, resolveAutoCurrency, resolveDisplayCurrency } from "./buyer-display-preferences"

describe("buyer display preferences", () => {
  it("maps delivery countries to their local display currencies", () => {
    expect(resolveAutoCurrency("US")).toBe("usd")
    expect(resolveAutoCurrency("cn")).toBe("cny")
    expect(resolveAutoCurrency("DE")).toBe("eur")
  })

  it("allows an explicit currency to override auto", () => {
    expect(resolveDisplayCurrency({ countryCode: "cn", currencyCode: "usd" })).toBe("usd")
  })

  it("converts display amounts through the USD base rate", () => {
    expect(convertDisplayAmount(10, "usd", "cny")).toBe(72)
    expect(convertDisplayAmount(72, "cny", "usd")).toBe(10)
  })
})
