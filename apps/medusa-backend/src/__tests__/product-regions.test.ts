import {
  isProductAvailableInRegion,
  mergeSupportedRegionIdsIntoMetadata,
  resolveProductSupportedRegionIds,
  resolveRegionIdForCountry,
} from "../lib/product-regions"

describe("product-regions", () => {
  it("reads supported_region_ids from metadata", () => {
    expect(
      resolveProductSupportedRegionIds({
        metadata: { supported_region_ids: ["reg_us", "reg_cn"] },
      })
    ).toEqual(["reg_us", "reg_cn"])
  })

  it("treats missing region ids as available in any region", () => {
    expect(isProductAvailableInRegion({ metadata: {} }, "reg_us")).toBe(true)
    expect(isProductAvailableInRegion({ metadata: {} }, null)).toBe(true)
  })

  it("restricts products to selected regions", () => {
    const product = {
      metadata: { supported_region_ids: ["reg_cn"] },
    }
    expect(isProductAvailableInRegion(product, "reg_cn")).toBe(true)
    expect(isProductAvailableInRegion(product, "reg_us")).toBe(false)
  })

  it("resolves region id from country code", () => {
    const regions = [
      { region_id: "reg_us", name: "United States", currency_code: "usd", country_codes: ["us"] },
      { region_id: "reg_cn", name: "China", currency_code: "cny", country_codes: ["cn"] },
    ]
    expect(resolveRegionIdForCountry(regions, "cn")).toBe("reg_cn")
    expect(resolveRegionIdForCountry(regions, "us")).toBe("reg_us")
  })

  it("merges supported_region_ids into metadata", () => {
    expect(
      mergeSupportedRegionIdsIntoMetadata({ requires_shipping: true }, ["reg_us"])
    ).toEqual({
      requires_shipping: true,
      supported_region_ids: ["reg_us"],
    })
  })
})
