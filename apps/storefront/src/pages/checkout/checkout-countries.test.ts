import { CHECKOUT_COUNTRIES, isCheckoutCountryCode, shippingUnavailableMessage } from "./checkout-countries"

describe("checkout country and shipping mapping", () => {
  it("maps country labels to lowercase ISO codes", () => {
    expect(CHECKOUT_COUNTRIES.find((country) => country.name === "China")?.code).toBe("cn")
    expect(CHECKOUT_COUNTRIES.find((country) => country.name === "United States")?.code).toBe("us")
    expect(isCheckoutCountryCode("GB")).toBe(true)
    expect(isCheckoutCountryCode("xx")).toBe(false)
  })

  it("hides backend shipping price implementation details", () => {
    expect(shippingUnavailableMessage(new Error("Shipping options with IDs so_1 do not have a price")))
      .toBe("Shipping method unavailable for this cart/address. Choose another country or contact the store.")
  })
})
