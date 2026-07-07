import { describe, expect, it } from "vitest"
import {
  isCatalogSupplierProductId,
  isS2bProvisioned,
  needsS2bProvisionBeforePublish,
  resolveProductFulfillmentStatus,
} from "./product-fulfillment-status"

describe("product fulfillment status", () => {
  it("detects catalog supplier ids", () => {
    expect(isCatalogSupplierProductId("sp_tshirt")).toBe(true)
    expect(isCatalogSupplierProductId("1672")).toBe(false)
  })

  it("detects provisioned S2B products", () => {
    expect(
      isS2bProvisioned({
        supplier_product_id: "1672",
        supplier_material_id: "99",
      })
    ).toBe(true)
    expect(isS2bProvisioned({ supplier_product_id: "sp_tshirt" })).toBe(false)
  })

  it("returns ready when S2B product exists", () => {
    const status = resolveProductFulfillmentStatus({
      source: "ai",
      supplier_product_id: "1672",
      supplier_material_id: "88",
      print_file_url: "http://localhost/print.png",
    })
    expect(status.state).toBe("ready")
  })

  it("returns error when metadata has s2b_provision_error", () => {
    const status = resolveProductFulfillmentStatus(
      {
        source: "ai",
        supplier_product_id: "sp_tshirt",
        print_file_url: "http://localhost/print.png",
        metadata: { s2b_provision_error: "timeout" },
      },
      {}
    )
    expect(status.state).toBe("error")
    if (status.state === "error") {
      expect(status.detail).toBe("timeout")
      expect(status.canRetry).toBe(true)
    }
  })

  it("needs provision before publish when pending", () => {
    expect(
      needsS2bProvisionBeforePublish({
        source: "ai",
        supplier_product_id: "sp_tshirt",
        print_file_url: "http://localhost/print.png",
      })
    ).toBe(true)
  })

  it("does not require print-file provisioning for supplier catalog products", () => {
    const product = {
      source: "manual",
      supplier_id: "sup_s2bdiy",
      supplier_product_id: "sp_catalog_1",
      metadata: {
        synced_from_supplier: true,
        s2b_provision_error: "Product has no print file — cannot provision S2BDIY fulfillment",
      },
    }

    expect(resolveProductFulfillmentStatus(product).state).toBe("ready")
    expect(needsS2bProvisionBeforePublish(product)).toBe(false)
  })
})
