import type { StoreProduct } from "../../lib/mock-data"
import { resolveProductRegionAvailability, type BuyerShipToRegion } from "./product-sales-region-availability"

const regions: BuyerShipToRegion[] = [
  {
    id: "reg_us",
    zone: "North America",
    country_region_en: "United States",
    country_region_zh: "美国",
    country_code: "us",
    phone_code: "1",
    abbreviation: "US",
    enabled: true,
    blocked: false,
  },
  {
    id: "reg_it",
    zone: "Europe",
    country_region_en: "Italy",
    country_region_zh: "意大利",
    country_code: "it",
    phone_code: "39",
    abbreviation: "IT",
    enabled: true,
    blocked: false,
  },
]

const product = (input: Partial<StoreProduct>): StoreProduct => ({
  id: "prod_1",
  title: "Test product",
  category: "Test",
  description: "Test",
  imageUrl: "",
  price: "$10",
  reviewCount: 0,
  supportedRegions: [],
  numericPrice: 10,
  ...input,
})

describe("resolveProductRegionAvailability", () => {
  it("requires buyers to choose a preferred shipping region before add to cart", () => {
    expect(resolveProductRegionAvailability(product({}), regions, [])).toMatchObject({
      available: false,
      message: "Choose your shipping regions before adding this item",
    })
  })

  it("allows selected-region products when any preferred region is supported", () => {
    expect(resolveProductRegionAvailability(product({
      salesRegionMode: "selected",
      salesRegionIds: ["reg_it"],
    }), regions, ["us", "it"])).toMatchObject({
      available: true,
      countryCode: "it",
      regionName: "Italy",
    })
  })
})
