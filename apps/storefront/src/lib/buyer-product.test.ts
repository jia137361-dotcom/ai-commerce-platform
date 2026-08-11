import {
  normalizeBuyerProduct,
  normalizeBuyerProductImage,
  normalizeBuyerProductPrice,
  normalizeBuyerProductVariants,
} from "./buyer-product"

describe("buyer product normalization", () => {
  it("safely handles missing image and price", () => {
    const product = normalizeBuyerProduct({ product_id: "prod_missing", title: "Missing fields" })
    expect(product.imageUrl).toBe("")
    expect(product.numericPrice).toBeUndefined()
    expect(product.price).toBe("Price unavailable")
  })

  it("uses the first available real image", () => {
    expect(normalizeBuyerProductImage({ images: [{ url: null }, { url: "https://example.com/item.jpg" }] }))
      .toBe("https://example.com/item.jpg")
  })

  it("keeps backend product prices in major units without inventing a fallback", () => {
    expect(normalizeBuyerProductPrice({ price: 2450 })).toBe(2450)
    expect(normalizeBuyerProductPrice({ price: null })).toBeUndefined()
  })

  it("normalizes supplier English details for the product page", () => {
    const product = normalizeBuyerProduct({
      product_id: "prod_supplier",
      title: "Supplier product",
      supplier_details: {
        supplier_product_code: "S2B-100",
        english: {
          english_material: "100% cotton",
          colors: [{ id: "1", name: "Black" }],
          sizes: [{ id: "2", name: "Large" }],
          images: ["https://example.com/product.jpg"],
          blank_design_images: ["https://example.com/blank.jpg"],
          print_areas: [{ design_area_width: 1200, design_area_height: 1600 }],
        },
      },
    })

    expect(product.supplierDetails).toEqual(expect.objectContaining({
      supplierProductCode: "S2B-100",
      englishMaterial: "100% cotton",
      colors: [{ id: "1", name: "Black" }],
      sizes: [{ id: "2", name: "Large" }],
      images: ["https://example.com/product.jpg"],
      blankDesignImages: ["https://example.com/blank.jpg"],
      printSpecs: [{ design_area_width: 1200, design_area_height: 1600 }],
    }))
  })

  it("normalizes real variants and falls back only to the real bridge variant id", () => {
    expect(normalizeBuyerProductVariants({ is_cart_addable: true, variants: [{ id: "variant_a", title: "Large", inventory_quantity: 2 }] })[0])
      .toEqual(expect.objectContaining({ id: "variant_a", title: "Large", inventoryQuantity: 2 }))
    expect(normalizeBuyerProductVariants({ is_cart_addable: true, medusa_variant_id: "variant_bridge" })[0]?.id).toBe("variant_bridge")
  })

  it("treats returned native variants as selectable cart variants", () => {
    const product = normalizeBuyerProduct({
      product_id: "prod_multi",
      title: "Multi option product",
      is_cart_addable: true,
      variants: [
        { id: "variant_small", title: "Small" },
        { id: "variant_large", title: "Large" },
      ],
    })

    expect(product.isCartAddable).toBe(true)
    expect(product.variants?.map((variant) => variant.id)).toEqual(["variant_small", "variant_large"])
  })

  it("uses native ids embedded in supplier variant rows", () => {
    const variants = normalizeBuyerProductVariants({
      is_cart_addable: true,
      variants: [
        { supplier_variant_id: "s2b-black-m", medusa_variant_id: "variant_black_m", color: "Black", size: "M" },
        { supplier_variant_id: "s2b-black-l", medusa_variant_id: "variant_black_l", color: "Black", size: "L" },
      ],
    })
    expect(variants.map(({ id, title }) => ({ id, title }))).toEqual([
      { id: "variant_black_m", title: "Black / M" },
      { id: "variant_black_l", title: "Black / L" },
    ])
  })
})
