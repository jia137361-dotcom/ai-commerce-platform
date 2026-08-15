import { applySkuUpdates, isSkuPurchasable } from "../lib/product-sku"

describe("product SKU configuration", () => {
  const variants = [
    { supplier_variant_id: "sv_black_m", medusa_variant_id: "mv_black_m", sku: "CAT-BLK-M", color: "Black", size: "M", price: 24.99, cost: 8.5 },
    { supplier_variant_id: "sv_white_m", medusa_variant_id: "mv_white_m", sku: "CAT-WHT-M", color: "White", size: "M", price: 24.99, cost: 8.5 },
  ]

  it("applies a price override and disabled status only to selected supplier variants", () => {
    expect(applySkuUpdates(variants, [{ supplier_variant_id: "sv_black_m", price_override: 29.99, enabled: false }])).toEqual([
      expect.objectContaining({ supplier_variant_id: "sv_black_m", price_override: 29.99, enabled: false }),
      expect.objectContaining({ supplier_variant_id: "sv_white_m", price_override: null, enabled: true }),
    ])
  })

  it("rejects purchase for a disabled Medusa variant", () => {
    const configured = applySkuUpdates(variants, [{ supplier_variant_id: "sv_black_m", enabled: false }])
    expect(isSkuPurchasable(configured, "mv_black_m")).toBe(false)
    expect(isSkuPurchasable(configured, "mv_white_m")).toBe(true)
  })

  it("clears an override without changing the SKU enabled state", () => {
    const variants = applySkuUpdates([{ supplier_variant_id: "s2b-red-m", price_override: 42, enabled: false }], [
      { supplier_variant_id: "s2b-red-m", price_override: null },
    ])
    expect(variants[0]).toMatchObject({ price_override: null, enabled: false })
  })
})
