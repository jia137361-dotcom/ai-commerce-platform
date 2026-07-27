import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"

jest.mock("../reviews/OrderReviewDialog", () => ({
  OrderReviewDialog: () => null,
}))

jest.mock("../../auth/useBuyerAuth", () => ({
  useBuyerAuth: () => ({ customer: null, isLoading: false }),
}))

jest.mock("../../lib/buyer-api", () => ({
  createRefundRequest: jest.fn(),
  formatBuyerMoney: (amount: number, currency?: string) => `${currency ?? "usd"} ${amount}`,
  readBuyerPreferences: () => ({ countryCode: "us" }),
  reorderItemsToCheckout: jest.fn(),
}))

jest.mock("./OrderPreviewImage", () => ({
  OrderPreviewImage: ({ title }: { title: string }) => createElement("span", null, title),
}))

import { OrderHistoryCard } from "./OrderHistoryCard"

describe("OrderHistoryCard design-system integration", () => {
  it("shows buyer status and logistic actions for shipped orders", () => {
    const html = renderToStaticMarkup(
      createElement(OrderHistoryCard, {
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
        onConfirmReceipt: async () => undefined,
      })
    )

    expect(html).toContain('href="/account/orders/order_123/tracking"')
    expect(html).toContain("Delivered, pending confirmation")
    expect(html).toContain("View logistic")
    expect(html).toContain("Confirm delivery")
    expect(html).toContain("buyer-ui-card")
  })

  it("shows reviews and refund actions from real order eligibility", () => {
    const html = renderToStaticMarkup(
      createElement(OrderHistoryCard, {
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
      })
    )
    expect(html).toContain("Received")
    expect(html).toContain("Reviews")
    expect(html).toContain("Refund")
    expect(html).toContain("Order again")
    expect(html).not.toContain("Confirm delivery")
  })

  it("shows view review link for completed reviews", () => {
    const html = renderToStaticMarkup(
      createElement(OrderHistoryCard, {
        order: {
          orderId: "order_reviewed",
          displayId: "8",
          buyerDisplayStatus: "reviewed",
          itemCount: 1,
          previewItems: [{ title: "T-shirt", quantity: 1, productId: "prod_shirt" }],
          reviewCompleted: true,
        },
      })
    )

    expect(html).toContain("Reviews")
    expect(html).toContain('href="/products/prod_shirt?viewReviewOrder=8#reviews"')
  })
})
