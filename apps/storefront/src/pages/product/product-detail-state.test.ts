import type { StoreProduct } from "../../lib/mock-data"
import { resolveProductPurchaseState, resolveSelectedProductVariant } from "./product-detail-state"

const product: StoreProduct = {
  id: "prod_detail",
  title: "Detail product",
  category: "Collection",
  price: "$21.25 USD",
  numericPrice: 21.25,
  imageUrl: "",
  medusaVariantId: "variant_default",
  isCartAddable: true,
  variants: [{ id: "variant_default", title: "Default option", isPurchasable: true }],
}

describe("product detail purchase state", () => {
  it("selects a real normalized variant", () => {
    expect(resolveSelectedProductVariant(product, "variant_default")?.id).toBe("variant_default")
  })

  it("updates selection to a requested variant in a multi-variant product", () => {
    const multiple = {
      ...product,
      variants: [
        { id: "variant_small", title: "Small", isPurchasable: true },
        { id: "variant_large", title: "Large", isPurchasable: true },
      ],
    }
    expect(resolveSelectedProductVariant(multiple, "variant_large")?.title).toBe("Large")
  })

  it("disables add to cart when no purchasable variant exists", () => {
    const state = resolveProductPurchaseState({ ...product, medusaVariantId: undefined, variants: [] }, undefined)
    expect(state.canAdd).toBe(false)
    expect(state.reason).toContain("No purchasable variant")
  })

  it("does not invent inventory when the backend omits it", () => {
    const variant = resolveSelectedProductVariant(product)
    expect(resolveProductPurchaseState(product, variant)).toEqual(expect.objectContaining({
      canAdd: true,
      availabilityLabel: "Availability confirmed at checkout",
    }))
  })
})
