import { describe, expect, it } from "vitest"
import { pickPreferredWhiteTee } from "./ai-studio-supplier"

describe("pickPreferredWhiteTee", () => {
  it("prefers S2BDIY tee and white medium variant", () => {
    const result = pickPreferredWhiteTee([
      {
        supplier_product_id: "sp_mock",
        supplier_id: "sup_citigoo_mock",
        name: "Mock T-shirt",
        variants: [
          { supplier_variant_id: "v_black", color_name: "Black", size_name: "M" },
        ],
      },
      {
        supplier_product_id: "sp_s2b",
        supplier_id: "sup_s2bdiy",
        name: "S2BDIY White Tee",
        basic_product_id: "1672",
        variants: [
          { supplier_variant_id: "v_white_s", color_name: "White", size_name: "S" },
          { supplier_variant_id: "v_white_m", color_name: "White", size_name: "M" },
        ],
      },
    ])

    expect(result?.product.supplier_product_id).toBe("sp_s2b")
    expect(result?.variant?.supplier_variant_id).toBe("v_white_m")
  })
})
