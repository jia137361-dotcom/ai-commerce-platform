import {
  mergeRequiresShippingIntoMetadata,
  resolveProductRequiresShipping,
} from "../lib/product-shipping"

describe("product shipping preferences", () => {
  it("defaults POD catalog products to physical delivery", () => {
    expect(
      resolveProductRequiresShipping({
        platform_product_id: "pp_tshirt",
        supplier_product_id: "sp_tshirt",
      })
    ).toBe(true)
  })

  it("reads explicit metadata preference", () => {
    expect(
      resolveProductRequiresShipping({
        metadata: { requires_shipping: false },
        supplier_product_id: "sp_tshirt",
      })
    ).toBe(false)
  })

  it("merges requires_shipping into metadata", () => {
    expect(
      mergeRequiresShippingIntoMetadata({ gallery: [] }, true)
    ).toEqual({
      gallery: [],
      requires_shipping: true,
    })
  })
})
