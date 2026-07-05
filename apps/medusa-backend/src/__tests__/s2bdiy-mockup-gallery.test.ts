import {
  extractMockupImageUrl,
  extractProductMockupGalleryFromS2bDetail,
  mergeProductGalleryWithS2bMockups,
} from "../modules/suppliers/s2bdiy/s2bdiy-product"

describe("S2BDIY mockup gallery extraction", () => {
  const sampleDetail = {
    id: 174951,
    show_images: [
      {
        color_id: 6,
        color_name: "白色",
        images: [
          {
            src: "https://cdn.example.com/show/front.jpg",
          },
          {
            src: "https://cdn.example.com/show/back.jpg",
          },
        ],
      },
    ],
    variants: [
      {
        show_images: "https://cdn.example.com/show/variant.jpg",
      },
    ],
  }

  it("extracts show_images into mockup gallery items", () => {
    const gallery = extractProductMockupGalleryFromS2bDetail(sampleDetail)
    expect(gallery.map((item) => item.url)).toEqual([
      "https://cdn.example.com/show/front.jpg",
      "https://cdn.example.com/show/back.jpg",
      "https://cdn.example.com/show/variant.jpg",
    ])
    expect(gallery[0]).toMatchObject({ id: "mockup_front", label: "白色 1", kind: "mockup" })
  })

  it("returns first mockup url for legacy extractMockupImageUrl", () => {
    expect(extractMockupImageUrl(sampleDetail)).toBe("https://cdn.example.com/show/front.jpg")
  })

  it("merges S2B mockups while preserving design assets", () => {
    const merged = mergeProductGalleryWithS2bMockups(
      [
        { id: "mockup_front", label: "Old", url: "https://old.example/mock.jpg", kind: "mockup" },
        { id: "design", label: "Print Artwork", url: "https://old.example/design.png", kind: "design" },
      ],
      extractProductMockupGalleryFromS2bDetail({
        show_images: [
          {
            images: [{ src: "https://cdn.example.com/show/front.jpg" }],
          },
        ],
      })
    )

    expect(merged.map((item) => item.id)).toEqual(["mockup_front", "design"])
    expect(merged[0]?.url).toBe("https://cdn.example.com/show/front.jpg")
    expect(merged[1]?.url).toBe("https://old.example/design.png")
  })
})
