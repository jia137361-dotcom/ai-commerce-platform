import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import type { StoreProduct } from "../../lib/mock-data"
import { BuyerLocaleProvider } from "../../lib/locale"
import { StoreProductResults } from "./StoreProductResults"

const product: StoreProduct = {
  id: "prod_grid",
  title: "Grid product",
  category: "Collection",
  price: "$10.00 USD",
  numericPrice: 10,
  imageUrl: "",
  isCartAddable: false,
}

const render = (props: Partial<Parameters<typeof StoreProductResults>[0]> = {}) =>
  renderToStaticMarkup(
    createElement(
      BuyerLocaleProvider,
      null,
      createElement(StoreProductResults, {
        loading: false,
        products: [],
        hasFilters: false,
        onRetry: () => undefined,
        ...props,
      })
    )
  )

describe("StoreProductResults", () => {
  it("renders loading state", () => expect(render({ loading: true })).toContain("Loading products"))
  it("renders empty state", () => expect(render()).toContain("No products yet"))
  it("renders a product grid from API-normalized data", () => {
    const html = render({ products: [product] })
    expect(html).toContain("buyer-shop-product-grid")
    expect(html).toContain("Grid product")
  })
})
