import { buildBuyNowHref } from "./product-buy-now"

describe("buy now navigation", () => {
  it("opens checkout for the current store", () => {
    expect(buildBuyNowHref("store_a")).toBe("/checkout?store=store_a")
  })

  it("falls back to the default checkout route without a store", () => {
    expect(buildBuyNowHref(" ")).toBe("/checkout")
  })
})
