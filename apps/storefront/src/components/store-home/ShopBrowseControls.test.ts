import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { BuyerLocaleProvider } from "../../lib/locale"
import { ShopBrowseControls } from "./ShopBrowseControls"

describe("ShopBrowseControls", () => {
  it("uses supply-chain category chips and drops legacy Category tab", () => {
    const html = renderToStaticMarkup(
      createElement(
        BuyerLocaleProvider,
        null,
        createElement(ShopBrowseControls, {
          categories: [{ id: 247, name: "Short sleeve T-shirt", parentId: 182 }],
          activeCategoryId: "all",
          onCategoryChange: () => undefined,
          query: "",
          onQueryChange: () => undefined,
          sort: "recommended",
          onSortChange: () => undefined,
          activeSection: "items",
          onSectionChange: () => undefined,
        })
      )
    )
    expect(html).toContain("All blanks")
    expect(html).toContain("Short sleeve T-shirt")
    expect(html).toContain("Reviews")
    expect(html).toContain("About")
    expect(html).not.toContain(">Category<")
    expect(html).not.toContain("Coffee")
    expect(html).not.toContain("Deals")
  })
})
