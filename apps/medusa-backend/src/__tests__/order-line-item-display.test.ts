import { enrichOrderLineItemsWithImages, resolveOrderLineItemThumbnail } from "../lib/order-line-item-display"

describe("order-line-item-display", () => {
  it("prefers metadata mockup image when native thumbnail is missing", () => {
    expect(
      resolveOrderLineItemThumbnail({
        thumbnail: null,
        metadata: { mockup_image_url: "https://example.com/mockup.png" },
      })
    ).toBe("https://example.com/mockup.png")
  })

  it("loads product images when line metadata has no image", async () => {
    const items = await enrichOrderLineItemsWithImages(
      {
        listProducts: async () => [
          { id: "prod_1", mockup_image_url: "https://example.com/product.png" },
        ],
      },
      [{ metadata: { mc_product_id: "prod_1" } }]
    )

    expect(items[0]?.thumbnail).toBe("https://example.com/product.png")
  })

  it("prefers catalog product image over stale line thumbnails", async () => {
    const items = await enrichOrderLineItemsWithImages(
      {
        listProducts: async () => [
          { id: "prod_1", mockup_image_url: "https://example.com/catalog.png" },
        ],
      },
      [{ thumbnail: "https://example.com/stale.png", metadata: { mc_product_id: "prod_1" } }]
    )

    expect(items[0]?.thumbnail).toBe("https://example.com/catalog.png")
  })
})
