import { buildLineItemProductionMetadata } from "../lib/line-item-production-metadata"

describe("buildLineItemProductionMetadata", () => {
  it("maps linked product and supplier variant fields", async () => {
    const storeCoreService = {
      listSupplierProductVariants: jest.fn().mockResolvedValue([
        {
          id: "spv_tshirt_black_m",
          color: "black",
          size: "M",
          raw_json: { print_position: "front" },
        },
      ]),
      listSupplierPrintSpecs: jest.fn().mockResolvedValue([]),
    }

    const meta = await buildLineItemProductionMetadata(storeCoreService as any, {
      id: "prod_test_1",
      title: "Custom Test Shirt",
      store_id: "default_store",
      supplier_id: "sup_citigoo_mock",
      supplier_product_id: "sp_tshirt",
      supplier_variant_id: "spv_tshirt_black_m",
      basic_product_id: "1672",
      supplier_size_id: "1",
      supplier_color_id: "2",
      print_file_url: "https://example.com/print.png",
      mockup_image_url: "https://example.com/mockup.png",
    })

    expect(meta.mc_product_id).toBe("prod_test_1")
    expect(meta.mc_product_title).toBe("Custom Test Shirt")
    expect(meta.store_id).toBe("default_store")
    expect(meta.basic_product_id).toBe("1672")
    expect(meta.supplier_id).toBe("sup_citigoo_mock")
    expect(meta.supplier_product_id).toBe("sp_tshirt")
    expect(meta.supplier_variant_id).toBe("spv_tshirt_black_m")
    expect(meta.print_file_url).toBe("https://example.com/print.png")
    expect(meta.mockup_image_url).toBe("https://example.com/mockup.png")
    expect(meta.color).toBe("black")
    expect(meta.size).toBe("M")
    expect(meta.print_position).toBe("front")
  })
})
