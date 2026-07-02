import { formatProductRegionCountries, formatProductRegionNames } from "./product-regions"

describe("product-regions", () => {
  it("formats region names for display", () => {
    expect(
      formatProductRegionNames([
        { region_id: "reg_us", name: "United States", currency_code: "usd", country_codes: ["us"] },
        { region_id: "reg_cn", name: "China", currency_code: "cny", country_codes: ["cn"] },
      ])
    ).toBe("United States, China")
  })

  it("formats supported countries from regions", () => {
    expect(
      formatProductRegionCountries([
        { region_id: "reg_us", name: "United States", currency_code: "usd", country_codes: ["us"] },
        { region_id: "reg_cn", name: "China", currency_code: "cny", country_codes: ["cn"] },
      ])
    ).toBe("US, CN")
  })
})
