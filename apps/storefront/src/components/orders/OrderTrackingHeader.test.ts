import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { OrderTrackingHeader } from "./OrderTrackingHeader"

describe("OrderTrackingHeader", () => {
  it("shows a back link and hides search another order", () => {
    const html = renderToStaticMarkup(
      createElement(OrderTrackingHeader, {
        orderId: "order_123",
        displayId: "42",
        backHref: "/account/orders",
        backLabel: "Back to orders",
        tracking: {
          orderId: "order_123",
          paymentStatus: "paid",
          fulfillmentStatus: "shipped",
          storeId: "default_store",
          shipments: [],
          supplierOrders: [],
          events: [],
        },
      })
    )

    expect(html).toContain('href="/account/orders"')
    expect(html).toContain("Back to orders")
    expect(html).not.toContain("Search another order")
  })
})
