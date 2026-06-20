import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { ProductDetailStatus } from "./ProductDetailStatus"

describe("ProductDetailStatus", () => {
  it("renders loading state", () => {
    expect(renderToStaticMarkup(createElement(ProductDetailStatus, { loading: true, onRetry: () => undefined }))).toContain("Loading product detail")
  })

  it("renders a not found state without mock product content", () => {
    const html = renderToStaticMarkup(createElement(ProductDetailStatus, { loading: false, error: "HTTP 404: Product not found", onRetry: () => undefined }))
    expect(html).toContain("Product not found")
    expect(html).toContain("may no longer be available")
  })
})
