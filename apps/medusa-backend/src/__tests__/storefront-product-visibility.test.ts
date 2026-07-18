import {
  isBuyerCustomDesignProduct,
  isStorefrontProductVisible,
} from "../lib/storefront-product-visibility"

describe("storefront product visibility", () => {
  it("allows published catalog products", () => {
    expect(isStorefrontProductVisible({ status: "published", metadata: {} })).toBe(true)
  })

  it("hides ordinary drafts", () => {
    expect(isStorefrontProductVisible({ status: "draft", metadata: {} })).toBe(false)
  })

  it("allows buyer custom designs even while draft", () => {
    expect(
      isStorefrontProductVisible({
        status: "draft",
        metadata: { buyer_design: true },
      })
    ).toBe(true)
    expect(isBuyerCustomDesignProduct({ tags: ["custom-design"] })).toBe(true)
  })

  it("hides archived products", () => {
    expect(
      isStorefrontProductVisible({
        status: "archived",
        metadata: { buyer_design: true },
      })
    ).toBe(false)
  })
})
