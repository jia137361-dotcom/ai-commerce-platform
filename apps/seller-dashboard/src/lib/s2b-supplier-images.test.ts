import { describe, expect, it } from "vitest"
import { mergeSelectedSupplierImages } from "./s2b-supplier-images"

describe("mergeSelectedSupplierImages", () => {
  it("keeps uploaded images while replacing only the selected supplier images", () => {
    expect(
      mergeSelectedSupplierImages(
        ["https://cdn/uploaded.jpg", "https://cdn/official-old.jpg"],
        ["https://cdn/official-new.jpg"],
        ["https://cdn/official-old.jpg", "https://cdn/official-new.jpg"],
      ),
    ).toEqual(["https://cdn/uploaded.jpg", "https://cdn/official-new.jpg"])
  })
})
