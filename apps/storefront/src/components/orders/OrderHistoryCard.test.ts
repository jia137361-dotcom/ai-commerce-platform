import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"

jest.mock("../reviews/OrderReviewDialog", () => ({
  OrderReviewDialog: () => null,
}))

jest.mock("../../lib/buyer-api", () => ({
  createRefundRequest: jest.fn(),
}))

jest.mock("./OrderPreviewImage", () => ({
  OrderPreviewImage: ({ title }: { title: string }) => createElement("span", null, title),
}))

import { OrderHistoryCard } from "./OrderHistoryCard"

describe("OrderHistoryCard design-system integration", () => {
  it("shows buyer status badge and tracking link for shipped orders", () => {
    const html = renderToStaticMarkup(createElement(OrderHistoryCard, {
      order: {
        orderId: "order_123",
        displayId: "75",
        createdAt: null,
        status: "pending",
        paymentStatus: "paid",
        fulfillmentStatus: "shipped",
        buyerDisplayStatus: "awaiting_receipt",
        currencyCode: "usd",
        total: 21.25,
        itemCount: 1,
        previewItems: [{ title: "Smoke item", quantity: 1, thumbnail: null }],
        receiptConfirmationRequired: true,
      },
    }))

    expect(html).toContain('href="/account/orders/order_123/tracking"')
    expect(html).toContain("#75")
    expect(html).toContain("To receive")
    expect(html).toContain("Track order")
    expect(html).toContain("buyer-ui-card")
    expect(html).not.toContain("View order")
  })

  it("shows receipt confirmation, review, and refund actions from real order eligibility", () => {
    const html = renderToStaticMarkup(createElement(OrderHistoryCard, {
      order: {
        orderId: "order_delivered",
        displayId: "88",
        fulfillmentStatus: "delivered",
        buyerDisplayStatus: "awaiting_review",
        itemCount: 1,
        previewItems: [{ title: "T-shirt", quantity: 1, productId: "prod_shirt" }],
        receiptConfirmedAt: "2026-06-24T10:00:00.000Z",
        reviewEligible: true,
      },
      customerEmail: "buyer@example.com",
      onConfirmReceipt: async () => undefined,
    }))
    expect(html).toContain("Awaiting review")
    expect(html).toContain("Write a review")
    expect(html).toContain("Return &amp; refund")
    expect(html).toContain("Refund only")
    expect(html).not.toContain("Confirm delivery")
  })

  it("shows view review link for completed reviews", () => {
    const html = renderToStaticMarkup(createElement(OrderHistoryCard, {
      order: {
        orderId: "order_reviewed",
        displayId: "8",
        buyerDisplayStatus: "reviewed",
        itemCount: 1,
        previewItems: [{ title: "T-shirt", quantity: 1, productId: "prod_shirt" }],
        reviewCompleted: true,
      },
    }))

    expect(html).toContain("View review")
    expect(html).toContain('href="/products/prod_shirt?viewReviewOrder=8#reviews"')
    expect(html).not.toContain("Write a review")
  })
})
