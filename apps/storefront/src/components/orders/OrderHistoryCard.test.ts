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
    expect(html).toContain("#75")
    expect(html).toContain("Pending")
    expect(html).toContain("View order")
    expect(html).toContain("Track order")
    expect(html).toContain("buyer-ui-card")
    expect(html).toContain("Payment authorized, not captured")
    expect(html).not.toContain(">Payment captured<")
  })

  it("shows receipt confirmation and review actions only from real order eligibility", () => {
    const html = renderToStaticMarkup(createElement(OrderHistoryCard, {
      order: {
        orderId: "order_delivered",
        displayId: "88",
        fulfillmentStatus: "delivered",
        itemCount: 1,
        previewItems: [{ title: "T-shirt", quantity: 1, productId: "prod_shirt" }],
        receiptConfirmationRequired: true,
        reviewEligible: true,
      },
      onConfirmReceipt: async () => undefined,
    }))
    expect(html).toContain("Confirm delivery")
    expect(html).toContain("Write a review")
    expect(html).toContain("/products/prod_shirt?reviewOrder=88#reviews")
  })
})
