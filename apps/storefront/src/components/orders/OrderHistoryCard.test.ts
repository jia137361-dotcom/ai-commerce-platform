import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { OrderHistoryCard } from "./OrderHistoryCard"

describe("OrderHistoryCard design-system integration", () => {
  it("keeps authenticated order detail and tracking links", () => {
    const html = renderToStaticMarkup(createElement(OrderHistoryCard, {
      order: {
        orderId: "order_123",
        displayId: "75",
        createdAt: null,
        status: "pending",
        paymentStatus: "authorized",
        fulfillmentStatus: "not_fulfilled",
        currencyCode: "usd",
        total: 21.25,
        itemCount: 1,
        previewItems: [{ title: "Smoke item", quantity: 1, thumbnail: null }],
      },
    }))

    expect(html).toContain('href="/account/orders/order_123"')
    expect(html).toContain('href="/account/orders/order_123/tracking"')
    expect(html).toContain("buyer-ui-card")
    expect(html).toContain("authorized")
  })
})
