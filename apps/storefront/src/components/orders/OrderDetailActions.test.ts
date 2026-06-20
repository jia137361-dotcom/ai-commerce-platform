import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import type { BuyerOrderDetail } from "../../lib/buyer-api"
import { OrderDetailActions } from "./OrderDetailActions"

const order = (overrides: Partial<BuyerOrderDetail> = {}): BuyerOrderDetail => ({
  orderId: "order_123",
  displayId: "75",
  status: "pending",
  paymentStatus: "authorized",
  fulfillmentStatus: "not_fulfilled",
  items: [],
  cancellation: { allowed: false, code: null, message: null },
  refundRequest: { allowed: false, code: null, message: null },
  ...overrides,
})

const renderActions = (value: BuyerOrderDetail, isAuthenticated = true) =>
  renderToStaticMarkup(createElement(OrderDetailActions, {
    order: value,
    isAuthenticated,
    trackingHref: "/account/orders/order_123/tracking",
    onCancel: () => undefined,
    onRequestRefund: () => undefined,
  }))

describe("OrderDetailActions", () => {
  it("shows Cancel only when cancellation is allowed", () => {
    const html = renderActions(order({ cancellation: { allowed: true } }))
    expect(html).toContain("Cancel order")
    expect(html).not.toContain("Request refund")
  })

  it("shows Request refund only when refund capability allows it", () => {
    const html = renderActions(order({ refundRequest: { allowed: true } }))
    expect(html).toContain("Request refund")
  })

  it("shows Pending review for an open request", () => {
    const html = renderActions(order({
      refundRequest: {
        allowed: false,
        openRequest: {
          id: "refund_1",
          orderId: "order_123",
          status: "pending",
          reason: "Wrong item",
          requestedAmount: 20,
        },
      },
    }))
    expect(html).toContain("Pending review")
    expect(html).not.toContain("Request refund")
  })

  it("hides cancel and refund actions for cancelled orders even with contradictory capabilities", () => {
    const html = renderActions(order({
      status: "cancelled",
      cancellation: { allowed: true },
      refundRequest: { allowed: true },
    }))
    expect(html).not.toContain("Cancel order")
    expect(html).not.toContain("Request refund")
  })

  it("keeps guest detail lookup-only and never renders authenticated actions", () => {
    const html = renderActions(order({
      cancellation: { allowed: true },
      refundRequest: { allowed: true },
    }), false)
    expect(html).toContain("Search another order")
    expect(html).not.toContain("Cancel order")
    expect(html).not.toContain("Request refund")
    expect(html).not.toContain("Back to orders")
  })

  it("describes authorization without claiming captured payment", () => {
    const html = renderActions(order({ cancellation: { allowed: true } }))
    expect(html).toContain("Payment authorized, not captured")
    expect(html).toContain("You can cancel this order before capture or fulfillment")
    expect(html).not.toContain(">Payment captured<")
    expect(html).not.toContain("Money paid")
  })
})
