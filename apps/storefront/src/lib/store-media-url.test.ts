import { resolveStoreAssetUrl } from "./store-media-url"

describe("resolveStoreAssetUrl", () => {
  it("rewrites medusa gallery assets to the storefront backend base URL", () => {
    expect(
      resolveStoreAssetUrl("http://localhost:9000/static/gallery/default_store-abc.jpg", "http://127.0.0.1:9000")
    ).toBe("http://127.0.0.1:9000/static/gallery/default_store-abc.jpg")
  })

  it("rewrites ai-worker mockup assets to the ai-worker base URL", () => {
    expect(
      resolveStoreAssetUrl(
        "http://127.0.0.1:9000/static/mockup_d55eefd09a2245f08c58e.png",
        "http://127.0.0.1:9000"
      )
    ).toBe("http://127.0.0.1:8001/static/mockup_d55eefd09a2245f08c58e.png")
  })

  it("rewrites relative static paths against the backend base URL", () => {
    expect(resolveStoreAssetUrl("/static/gallery/default_store-abc.jpg", "http://127.0.0.1:9000")).toBe(
      "http://127.0.0.1:9000/static/gallery/default_store-abc.jpg"
    )
  })

  it("leaves non-static URLs unchanged", () => {
    expect(resolveStoreAssetUrl("https://cdn.example.com/photo.jpg", "http://127.0.0.1:9000")).toBe(
      "https://cdn.example.com/photo.jpg"
    )
  })
})
