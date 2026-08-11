import {
  isBuyerCustomDesignProduct,
  isStorefrontCatalogVisible,
  isStorefrontProductVisible,
  isSupplierCatalogBlankProduct,
} from "../lib/storefront-product-visibility"

describe("storefront product visibility", () => {
  it("allows published ordinary catalog products on the store homepage", () => {
    expect(isStorefrontCatalogVisible({ status: "published", metadata: {} })).toBe(true)
    expect(isStorefrontProductVisible({ status: "published", metadata: {} })).toBe(true)
  })

  it("hides ordinary drafts from the store homepage", () => {
    expect(isStorefrontCatalogVisible({ status: "draft", metadata: {} })).toBe(false)
    expect(isStorefrontProductVisible({ status: "draft", metadata: {} })).toBe(false)
  })

  it("shows published supplier blanks on the store homepage", () => {
    expect(
      isStorefrontCatalogVisible({
        status: "published",
        metadata: { catalog_blank: true },
      })
    ).toBe(true)
    expect(
      isStorefrontCatalogVisible({
        status: "published",
        tags: ["blank", "s2bdiy"],
      })
    ).toBe(true)
    expect(isSupplierCatalogBlankProduct({ tags: ["blank", "s2bdiy"] })).toBe(true)
  })

  it("never shows buyer custom designs on the store homepage", () => {
    expect(
      isStorefrontCatalogVisible({
        status: "published",
        metadata: { buyer_design: true, customer_id: "cus_a" },
      })
    ).toBe(false)
    expect(
      isStorefrontCatalogVisible({
        status: "draft",
        metadata: { buyer_design: true, customer_id: "cus_a" },
      })
    ).toBe(false)
    expect(isBuyerCustomDesignProduct({ tags: ["custom-design"] })).toBe(true)
  })

  it("lets only the owning buyer open a custom design by id", () => {
    const ownPublished = {
      status: "published",
      metadata: { buyer_design: true, customer_id: "cus_a" },
    }
    const ownDraft = {
      status: "draft",
      metadata: { buyer_design: true, customer_id: "cus_a" },
    }
    const other = {
      status: "published",
      metadata: { buyer_design: true, customer_id: "cus_b" },
    }

    expect(isStorefrontProductVisible(ownPublished, { customerId: "cus_a" })).toBe(true)
    expect(isStorefrontProductVisible(ownDraft, { customerId: "cus_a" })).toBe(true)
    expect(isStorefrontProductVisible(other, { customerId: "cus_a" })).toBe(false)
    expect(isStorefrontProductVisible(ownPublished, { customerId: "cus_b" })).toBe(false)
    expect(isStorefrontProductVisible(ownPublished)).toBe(false)
  })

  it("hides archived ordinary products", () => {
    expect(
      isStorefrontCatalogVisible({
        status: "archived",
        metadata: { catalog_blank: true },
      })
    ).toBe(false)
  })
})
