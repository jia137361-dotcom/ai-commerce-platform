import { buildShipmentTrackingEvents } from "./buyer-tracking-events"

describe("buyer shipment tracking events", () => {
  it("does not show delivered for a shipped shipment without delivered evidence", () => {
    expect(
      buildShipmentTrackingEvents([
        {
          id: "shipment_1",
          status: "shipped",
          shippedAt: "2026-06-21T10:00:00.000Z",
          deliveredAt: null,
        },
      ])
    ).toEqual([
      { label: "Shipped", date: "2026-06-21T10:00:00.000Z", status: "shipped" },
    ])
  })

  it("shows delivered only after explicit delivered status and timestamp", () => {
    const events = buildShipmentTrackingEvents([
      {
        id: "shipment_1",
        status: "delivered",
        shippedAt: "2026-06-21T10:00:00.000Z",
        deliveredAt: "2026-06-23T10:00:00.000Z",
      },
    ])
    expect(events.at(-1)).toEqual({
      label: "Delivered",
      date: "2026-06-23T10:00:00.000Z",
      status: "delivered",
    })
  })
})
