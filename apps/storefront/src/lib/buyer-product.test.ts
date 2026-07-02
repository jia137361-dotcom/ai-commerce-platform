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

  it("normalizes minor-unit prices without inventing a fallback", () => {
    expect(normalizeBuyerProductPrice({ price: 2450 })).toBe(24.5)
    expect(normalizeBuyerProductPrice({ price: null })).toBeUndefined()
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
