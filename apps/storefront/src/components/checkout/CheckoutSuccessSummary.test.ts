import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"

jest.mock("../../lib/buyer-api", () => ({
  fetchSupplierCatalog: jest.fn(async () => ({ data: { items: [], total: 0, page: 1, perPage: 4, lastPage: 1, supplierId: "s" }, source: "live" })),
  ensureSupplierCatalogBlank: jest.fn(),
  formatBuyerMoney: (amount: number) => `$${amount}`,
}))

import { CheckoutSuccessSummary } from "./CheckoutSuccessSummary"

describe("CheckoutSuccessSummary", () => {
  it("renders transaction successful with homepage and view order actions", () => {
    const html = renderToStaticMarkup(
      createElement(CheckoutSuccessSummary, {
        info: { orderId: "order_123", displayId: "88", total: 21.25, currencyCode: "usd" },
        isAuthenticated: true,
      })
    )
    expect(html).toContain("Transaction successful")
    expect(html).toContain("Return homepage")
    expect(html).toContain("View order")
    expect(html).toContain('href="/account/orders/order_123"')
    expect(html).toContain('href="/store"')
  })

  it("links guests to order detail with email query", () => {
    const html = renderToStaticMarkup(
      createElement(CheckoutSuccessSummary, {
        info: {
          orderId: "order_123",
          email: "buyer@example.com",
          paymentProviderId: "pp_stripe_stripe",
          paymentMethodLabel: "VISA ···· 4242",
          paymentStatus: "captured",
        },
      })
    )
    expect(html).toContain("View order")
    expect(html).toContain("buyer%40example.com")
  })
})
