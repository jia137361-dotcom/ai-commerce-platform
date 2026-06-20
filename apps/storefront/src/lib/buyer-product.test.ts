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
})
