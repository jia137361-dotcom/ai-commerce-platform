import { resolveSupplierShipFromCountry } from "../lib/supplier-shipping-country"

describe("supplier shipping country", () => {
  it("prefers the S2BDIY country code when product shipping country is empty", () => {
    expect(resolveSupplierShipFromCountry({ ship_from_country: null }, { produce_country: "UK" })).toBe("UK")
  })

  it("preserves an explicit product shipping country", () => {
    expect(resolveSupplierShipFromCountry({ ship_from_country: "US" }, { produce_country: "UK" })).toBe("US")
  })
})
