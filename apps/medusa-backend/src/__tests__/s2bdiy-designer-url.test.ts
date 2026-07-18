import { describe, expect, it } from "vitest"
import {
  buildS2bdiyDesignerUrl,
  resolveS2bEditorMode,
} from "../lib/s2bdiy/product-design-config"

describe("S2BDIY designer URL", () => {
  it("preloads AI material in new mode when no real S2B product exists yet", () => {
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
      sizeId: "20",
      colorId: "6",
      viewId: "1",
      materialId: "57655",
      designType: 1,
      editorMode: "new",
    })

    expect(url).toContain("basicProductId=1672")
    expect(url).toContain("materialId=57655")
    expect(url).not.toContain("productId=")
  })

  it("opens redesign mode for real API quickCreate products", () => {
    const product = {
      supplier_product_id: "174951",
      supplier_material_id: "57655",
      metadata: {},
    }

    expect(resolveS2bEditorMode(product, "174951")).toBe("redesign")

    const url = buildS2bdiyDesignerUrl({
      sdkBaseUrl: "https://opensdktest.s2bdiy.com",
      token: "abc123",
      s2bProductId: "174951",
      editorMode: "redesign",
    })

    expect(url).toContain("productId=174951")
    expect(url).not.toContain("basicProductId=")
  })

  it("opens redesign mode for buyer DIY drafts without material_id", () => {
    const product = {
      supplier_product_id: "175872",
      basic_product_id: "3000",
      metadata: { buyer_design: true, design_source: "buyer_sdk" },
    }

    expect(resolveS2bEditorMode(product, "175872")).toBe("redesign")

    const url = buildS2bdiyDesignerUrl({
      sdkBaseUrl: "https://opensdktest.s2bdiy.com",
      token: "abc123",
      basicProductId: "3000",
      s2bProductId: "175872",
      editorMode: "redesign",
    })

    expect(url).toContain("productId=175872")
    expect(url).not.toContain("basicProductId=")
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
