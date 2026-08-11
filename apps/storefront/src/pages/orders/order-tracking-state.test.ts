import { hasOrderTrackingData } from "./order-tracking-state"

describe("order tracking state", () => {
  it("renders the empty state when no real tracking data exists", () => {
    expect(hasOrderTrackingData({
      orderId: "order_1",
      fulfillmentOrder: null,
      shipments: [],
      supplierOrders: [],
      events: [],
    })).toBe(false)
  })

  it("recognizes a real carrier event without inventing timeline nodes", () => {
    expect(hasOrderTrackingData({
      orderId: "order_1",
      fulfillmentOrder: null,
      shipments: [{ carrier: "DHL", trackingNumber: "TRACK-1" }],
      supplierOrders: [],
      events: [],
    })).toBe(true)
  })

  it("recognizes real supplier review status before carrier tracking exists", () => {
    expect(hasOrderTrackingData({
      orderId: "order_1",
      fulfillmentOrder: null,
      shipments: [],
      supplierOrders: [{ status: "reviewing", statusText: "审核中" }],
      events: [],
    })).toBe(true)
  })
})
