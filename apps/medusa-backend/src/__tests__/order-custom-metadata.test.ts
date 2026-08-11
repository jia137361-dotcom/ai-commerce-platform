import { resolveBuyerOrderFulfillmentStatus } from "../lib/order-custom-metadata"

describe("resolveBuyerOrderFulfillmentStatus", () => {
  it("returns stored shipped or delivered statuses unchanged", () => {
    expect(resolveBuyerOrderFulfillmentStatus({ mc_fulfillment_status: "shipped" })).toBe("shipped")
    expect(resolveBuyerOrderFulfillmentStatus({ mc_fulfillment_status: "delivered" })).toBe("delivered")
  })

  it("treats mock delivery evidence as delivered when metadata stage is still pushed", () => {
    expect(
      resolveBuyerOrderFulfillmentStatus({
        mc_fulfillment_status: "pushed",
        mock_delivered_at: "2026-07-05T08:45:58.954Z",
        mock_delivery_evidence: true,
      })
    ).toBe("delivered")
  })

  it("treats delivered_at timestamps as delivered", () => {
    expect(
      resolveBuyerOrderFulfillmentStatus({
        mc_fulfillment_status: "pushed",
        delivered_at: "2026-07-05T08:45:58.954Z",
      })
    ).toBe("delivered")
  })

  it("falls back to stored status or none", () => {
    expect(resolveBuyerOrderFulfillmentStatus({ mc_fulfillment_status: "pushed" })).toBe("pushed")
    expect(resolveBuyerOrderFulfillmentStatus(null)).toBe("none")
  })
})
