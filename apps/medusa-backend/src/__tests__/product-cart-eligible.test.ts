import { isBuyerDesignProduct, isProductCartEligible } from "../lib/product-cart-eligible"

describe("product-cart-eligible", () => {
  it("allows published catalog products with a variant", () => {
    expect(
      isProductCartEligible({
        status: "published",
        medusa_variant_id: "variant_1",
      })
    ).toBe(true)
  })

  it("blocks draft catalog products", () => {
    expect(
      isProductCartEligible({
        status: "draft",
        medusa_variant_id: "variant_1",
      })
    ).toBe(false)
  })

  it("allows buyer design drafts with a variant", () => {
    expect(
      isProductCartEligible({
        status: "draft",
        medusa_variant_id: "variant_1",
        metadata: { buyer_design: true },
      })
    ).toBe(true)
    expect(
      isBuyerDesignProduct({
        status: "draft",
        tags: ["buyer-diy"],
      })
    ).toBe(true)
  })

  it("blocks buyer designs without a cartable variant", () => {
    expect(
      isProductCartEligible({
        status: "draft",
        metadata: { buyer_design: true },
      })
    ).toBe(false)
  })
})
