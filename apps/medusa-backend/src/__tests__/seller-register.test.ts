import { slugifyStoreName } from "../lib/seller-register"

describe("slugifyStoreName", () => {
  it("normalizes store names into URL-safe slugs", () => {
    expect(slugifyStoreName("My Print Shop")).toBe("my-print-shop")
    expect(slugifyStoreName("  Hello!!! World  ")).toBe("hello-world")
    expect(slugifyStoreName("")).toBe("store")
  })
})
