import {
  authenticatedOrderDetailHref,
  resolveOrderDetailActions,
} from "./order-detail-state"

describe("authenticated order detail navigation and actions", () => {
  it("links account order cards to authenticated detail", () => {
    expect(authenticatedOrderDetailHref("order_123")).toBe(
      "/account/orders/order_123"
    )
  })

  it("shows Request refund for authenticated refund-eligible orders", () => {
    expect(resolveOrderDetailActions({
      isAuthenticated: true,
      cancellation: {
        allowed: false,
        code: "ORDER_ALREADY_PAID",
        message: "Paid orders require a refund request instead of cancellation.",
      },
      refundRequest: { allowed: true, code: null, message: null },
    })).toMatchObject({
      showCancel: false,
      showRequestRefund: true,
      showSearchAnotherOrder: false,
    })
  })

  it("does not show authenticated refund actions to guest detail", () => {
    expect(resolveOrderDetailActions({
      isAuthenticated: false,
      refundRequest: { allowed: true, code: null, message: null },
    })).toMatchObject({
      showCancel: false,
      showRequestRefund: false,
      showSearchAnotherOrder: true,
    })
  })

  it("keeps authorized-not-captured orders cancel-only", () => {
    expect(resolveOrderDetailActions({
      isAuthenticated: true,
      cancellation: { allowed: true, code: null, message: null },
      refundRequest: {
        allowed: false,
        code: "ORDER_AUTHORIZED_NOT_CAPTURED",
        message: "Cancel the order instead.",
      },
    })).toMatchObject({
      showCancel: true,
      showRequestRefund: false,
    })
  })

  it("hides both actions for cancelled orders", () => {
    expect(resolveOrderDetailActions({
      isAuthenticated: true,
      cancellation: { allowed: false, code: "ORDER_ALREADY_CANCELLED", message: null },
      refundRequest: { allowed: false, code: "ORDER_CANCELLED", message: null },
    })).toMatchObject({
      showCancel: false,
      showRequestRefund: false,
    })
  })
})
