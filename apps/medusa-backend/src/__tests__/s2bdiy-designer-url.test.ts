import {
  buildS2bdiyDesignerUrl,
  resolveS2bEditorMode,
} from "../lib/s2bdiy/product-design-config"

describe("S2BDIY designer URL", () => {
  it("opens documented new-design mode when no real S2B product exists yet", () => {
    const product = {
      supplier_product_id: "sp_tshirt",
      supplier_material_id: "57655",
      supplier_size_id: "20",
      supplier_color_id: "6",
      view_id: "1",
      design_type: 1,
      basic_product_id: "1672",
      metadata: {},
    }

    expect(resolveS2bEditorMode(product, null)).toBe("new")

    const url = buildS2bdiyDesignerUrl({
      sdkBaseUrl: "https://opensdktest.s2bdiy.com",
      token: "abc123",
      basicProductId: "1672",
      editorMode: "new",
    })

    expect(url).toContain("basicProductId=1672")
    expect(url).not.toContain("productId=")
    expect(url).not.toContain("materialId=")
    expect(url).not.toContain("sizeId=")
    expect(url).not.toContain("colorId=")
    expect(url).not.toContain("viewId=")
    expect(url).not.toContain("designType=")
  })

  it("keeps seller drafts on basicProductId editor mode even after a real S2B product exists", () => {
    const product = {
      supplier_product_id: "174951",
      supplier_material_id: "57655",
      basic_product_id: "1672",
      metadata: { s2b_sdk_saved: true },
    }

    expect(resolveS2bEditorMode(product, "174951")).toBe("new")

    const url = buildS2bdiyDesignerUrl({
      sdkBaseUrl: "https://opensdktest.s2bdiy.com",
      token: "abc123",
      basicProductId: "1672",
      editorMode: "new",
    })

    expect(url).toContain("basicProductId=1672")
    expect(url).not.toContain("productId=")
  })

  it("treats stale mock material as new mode until refreshed", () => {
    const product = {
      supplier_product_id: "992793",
      supplier_material_id: "mock_mat_9K5ADS1V",
      metadata: {},
    }

    expect(resolveS2bEditorMode(product, "992793")).toBe("new")
  })
})
