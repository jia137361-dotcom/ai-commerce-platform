import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { StoreGalleryCarousel } from "./StoreGalleryCarousel"

describe("StoreGalleryCarousel", () => {
  it("renders thumbnail controls when multiple gallery images exist", () => {
    const html = renderToStaticMarkup(createElement(StoreGalleryCarousel, {
      title: "Demo Shop",
      images: [
        "https://example.com/gallery-1.png",
        "https://example.com/gallery-2.png",
      ],
    }))

    expect(html).toContain("gallery-1.png")
    expect(html).toContain("gallery-2.png")
    expect(html).toContain("Gallery image selector")
    expect(html).toContain("Previous gallery image")
    expect(html).toContain("Next gallery image")
    expect(html).toContain("1 / 2")
  })
})
