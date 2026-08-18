import { readFileSync } from "node:fs"

describe("store topbar layout", () => {
  it("keeps the Ship to select arrow inside the Ship to control", () => {
    const css = readFileSync(require.resolve("../../styles/store-home.css"), "utf8")

    expect(css).toContain(".buyer-store-topbar--temu {\n  grid-template-columns: auto minmax(180px, 220px) auto minmax(0, 1fr) auto;")
    expect(css).toContain(".buyer-store-topbar--temu .buyer-store-ship {\n  width: 100%;")
    expect(css).toContain("padding-right: 18px;")
    expect(css).toContain(".buyer-store-topbar--temu .buyer-store-ship select {\n  width: 100%;")
    expect(css).toContain("max-width: 160px;")
  })
})
