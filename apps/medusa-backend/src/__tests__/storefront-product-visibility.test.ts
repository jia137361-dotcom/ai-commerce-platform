import {
  isBuyerCustomDesignProduct,
  isSupplierCatalogBlankProduct,
  isStorefrontProductVisible,
} from "../lib/storefront-product-visibility"

describe("storefront product visibility", () => {
  it("allows published catalog products", () => {
    expect(isStorefrontProductVisible({ status: "published", metadata: {} })).toBe(true)
  })

  it("hides ordinary drafts", () => {
    expect(isStorefrontProductVisible({ status: "draft", metadata: {} })).toBe(false)
  })

  it("hides buyer custom designs from the public storefront catalog", () => {
    expect(
      isStorefrontProductVisible({
        status: "published",
        metadata: { buyer_design: true },
      })
    ).toBe(false)
    expect(
      isStorefrontProductVisible({
        status: "draft",
        metadata: { buyer_design: true },
      })
    ).toBe(false)
    expect(isBuyerCustomDesignProduct({ tags: ["custom-design"] })).toBe(true)
  })

  it("hides supplier catalog blanks from the public storefront catalog", () => {
    expect(
      isStorefrontProductVisible({
        status: "published",
        metadata: { catalog_blank: true },
      })
    ).toBe(false)
    expect(isSupplierCatalogBlankProduct({ tags: ["blank", "s2bdiy"] })).toBe(true)
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
