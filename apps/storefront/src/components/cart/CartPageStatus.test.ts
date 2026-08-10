import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { CartPageStatus } from "./CartPageStatus"

const render = (props: Partial<Parameters<typeof CartPageStatus>[0]>) => renderToStaticMarkup(createElement(CartPageStatus, { loading: false, empty: false, onRetry: () => undefined, ...props }))

describe("CartPageStatus", () => {
  it("renders empty cart state with My Designs CTA", () => {
    const html = render({ empty: true })
    expect(html).toContain("Your cart is empty")
    expect(html).toContain("My Designs")
    expect(html).toContain('href="/my-designs"')
    expect(html).toContain("Continue shopping")
  })
  it("renders API error instead of the empty state", () => {
    const html = render({ error: "HTTP 500" })
    expect(html).toContain("Cart is unavailable")
    expect(html).not.toContain("Your cart is empty")
  })
})
