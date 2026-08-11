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
  setActiveBuyerStoreId: jest.fn(),
}))

jest.mock("../../lib/buyer-cart-storage", () => ({
  getBuyerCartIdentity: () => "buyer:cus_test",
}))

jest.mock("../../lib/buyer-platform-cart", () => ({
  registerStoreCart: jest.fn(),
}))

jest.mock("./OrderPreviewImage", () => ({
  OrderPreviewImage: ({ title }: { title: string }) => createElement("span", null, title),
}))

import { OrderHistoryCard } from "./OrderHistoryCard"

describe("OrderHistoryCard design-system integration", () => {
  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(Date.parse("2026-07-30T12:00:00.000Z"))
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

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

  it("shows continue payment for checkout reservation unpaid rows", () => {
    const html = renderToStaticMarkup(
      createElement(OrderHistoryCard, {
        order: {
          orderId: "cpa_active",
          orderKind: "checkout_reservation",
          checkoutCartId: "cart_active",
          checkoutRecoveryHref: "/checkout?store=default_store",
          paymentExpiresAt: "2026-07-30T12:15:00.000Z",
          buyerDisplayStatus: "unpaid",
          paymentStatus: "pending",
          fulfillmentStatus: "none",
          itemCount: 1,
          previewItems: [{ title: "Reserved item", quantity: 1 }],
        },
      })
    )

    expect(html).toContain("Continue payment")
    expect(html).toContain("Payment reserved for")
    expect(html).toContain("15:00")
    expect(html).toContain("Return to cart")
    expect(html).not.toContain("Order again")
  })

  it("requires re-adding checkout reservation items after the payment window expires", () => {
    const html = renderToStaticMarkup(
      createElement(OrderHistoryCard, {
        order: {
          orderId: "cpa_expired",
          orderKind: "checkout_reservation",
          checkoutCartId: "cart_expired",
          checkoutRecoveryHref: null,
          paymentExpiresAt: "2026-07-30T11:59:00.000Z",
          paymentAttemptStatus: "expired",
          buyerDisplayStatus: "unpaid",
          paymentStatus: "expired",
          fulfillmentStatus: "none",
          itemCount: 1,
          previewItems: [{ title: "Expired item", quantity: 1, variantId: "variant_1" }],
        },
      })
    )

    expect(html).toContain("Payment window expired")
    expect(html).toContain("Re-add items to cart to buy again.")
    expect(html).toContain("Re-add to cart")
    expect(html).not.toContain("Continue payment")
    expect(html).not.toContain("Return to cart")
  })
})
