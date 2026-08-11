import { resolveStoreAssetUrl } from "../lib/store-asset-url"

describe("store asset url resolution", () => {
  it("routes mockup files to ai-worker instead of medusa", () => {
    expect(
      resolveStoreAssetUrl("http://127.0.0.1:9000/static/mockup_d55eefd09a2245f08c58e.png")
    ).toBe("http://127.0.0.1:8001/static/mockup_d55eefd09a2245f08c58e.png")
  })

  it("routes gallery files to medusa", () => {
    expect(
      resolveStoreAssetUrl("http://localhost:9000/static/gallery/default_store-abc.jpg")
    ).toBe("http://127.0.0.1:9000/static/gallery/default_store-abc.jpg")
  })
})
