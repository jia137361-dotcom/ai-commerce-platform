import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { ShopBrowseControls } from "./ShopBrowseControls"

describe("ShopBrowseControls", () => {
  it("uses only supported top-level tabs and no fake categories", () => {
    const html = renderToStaticMarkup(createElement(ShopBrowseControls, { categories: [{ id: "all", name: "All" }], activeCategoryId: "all", onCategoryChange: () => undefined, query: "", onQueryChange: () => undefined, sort: "recommended", onSortChange: () => undefined, activeSection: "items", onSectionChange: () => undefined }))
    expect(html).toContain("All Items")
    expect(html).toContain("Category")
    expect(html).toContain("Reviews")
    expect(html).toContain("About")
    expect(html).not.toContain("Coffee")
    expect(html).not.toContain("Deals")
  })
})
