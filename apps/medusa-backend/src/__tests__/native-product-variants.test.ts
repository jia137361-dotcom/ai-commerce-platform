import { findStoreCoreVariantRow, readStoreCoreVariantRows } from "../lib/native-product-variants"

describe("native product variants", () => {
  const product = {
    variants: [
      { supplier_variant_id: "black-m", medusa_variant_id: "variant_black_m", supplier_color_id: "5", supplier_size_id: "21", color: "Black", size: "M", price: 79.9, stock: 50 },
      { supplier_variant_id: "black-l", medusa_variant_id: "variant_black_l", supplier_color_id: "5", supplier_size_id: "22", color: "Black", size: "L", price: 82.9, stock: 40 },
    ],
  }

  it("preserves multiple supplier options and native mappings", () => {
    expect(readStoreCoreVariantRows(product, 19.99)).toHaveLength(2)
    expect(findStoreCoreVariantRow(product, "variant_black_l")).toMatchObject({
      supplier_variant_id: "black-l",
      supplier_color_id: "5",
      supplier_size_id: "22",
      size: "L",
    })
  })
})
