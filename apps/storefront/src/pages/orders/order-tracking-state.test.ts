import { hasOrderTrackingData } from "./order-tracking-state"

describe("order tracking state", () => {
  it("renders the empty state when no real tracking data exists", () => {
    expect(hasOrderTrackingData({
      orderId: "order_1",
      fulfillmentOrder: null,
      shipments: [],
      events: [],
    })).toBe(false)
  })

  it("recognizes a real carrier event without inventing timeline nodes", () => {
    expect(hasOrderTrackingData({
      orderId: "order_1",
      fulfillmentOrder: null,
      shipments: [{ carrier: "DHL", trackingNumber: "TRACK-1" }],
      events: [],
    })).toBe(true)
  })
})
