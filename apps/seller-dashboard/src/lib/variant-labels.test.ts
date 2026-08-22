import { describe, expect, it } from "vitest"
import type { ProductVariantRow } from "@ai-commerce/shared-types"
import { renameVariantLabel, resetVariantLabels } from "./variant-labels"

const variants: ProductVariantRow[] = [
  { supplier_variant_id: "white-s", color: "白色", size: "S", price: 20, enabled: true },
  { supplier_variant_id: "white-m", color: "白色", size: "M", price: 21, enabled: false },
  { supplier_variant_id: "black-s", color: "黑色", size: "S", price: 20, enabled: true },
]

describe("variant label helpers", () => {
  it("renames every combination sharing a color label without changing selection", () => {
    const renamed = renameVariantLabel(variants, "color", "白色", "White")

    expect(renamed.map((variant) => variant.color)).toEqual(["White", "White", "黑色"])
    expect(renamed.map((variant) => variant.enabled)).toEqual([true, false, true])
    expect(renamed[0].supplier_variant_id).toBe("white-s")
  })

  it("resets labels from supplier defaults while preserving enabled state", () => {
    const reset = resetVariantLabels(
      variants.map((variant) => ({ ...variant, color: "Custom", size: "Custom size" })),
      {
        "white-s": { color: "White", size: "Small" },
        "white-m": { color: "White", size: "Medium" },
        "black-s": { color: "Black", size: "Small" },
      },
      "color"
    )

    expect(reset.map((variant) => variant.color)).toEqual(["White", "White", "Black"])
    expect(reset.map((variant) => variant.size)).toEqual(["Custom size", "Custom size", "Custom size"])
    expect(reset.map((variant) => variant.enabled)).toEqual([true, false, true])
  })

  it("matches defaults by the external S2B variant id when the stored id differs", () => {
    const reset = resetVariantLabels(
      [{ ...variants[0], color: "Custom", supplier_external_variant_id: "s2b-white-s" }],
      { "s2b-white-s": { color: "White" } },
      "color"
    )

    expect(reset[0].color).toBe("White")
  })

  it("ignores an empty replacement", () => {
    expect(renameVariantLabel(variants, "size", "S", "   ")).toEqual(variants)
  })
})
