import {
  buildFulfillmentTimeline,
  mergeAdminOrderMetadata,
  parseAdminOrdersListQuery,
  summarizeAdminOrderRow,
} from "../lib/admin-orders"

describe("mergeAdminOrderMetadata", () => {
  it("hydrates store metadata omitted by the order list projection", () => {
    expect(
      mergeAdminOrderMetadata(
        [{ id: "order_1", email: "buyer@example.com" }],
        [{ id: "order_1", metadata: { store_id: "store_a", payment_status: "paid" } }]
      )
    ).toEqual([
      {
        id: "order_1",
        email: "buyer@example.com",
        metadata: { store_id: "store_a", payment_status: "paid" },
      },
    ])
  })
})

describe("parseAdminOrdersListQuery", () => {
  it("parses limit offset email display_id", () => {
    expect(
      parseAdminOrdersListQuery({ limit: "10", offset: "5", email: "A@B.com", display_id: "1001" })
    ).toEqual({
      limit: 10,
      offset: 5,
      email: "a@b.com",
      display_id: 1001,
    })
  })
})

describe("summarizeAdminOrderRow", () => {
  it("computes items_count and total from line items", () => {
    expect(
      summarizeAdminOrderRow({
        items: [
          { quantity: 2, unit_price: 19.99 },
          { quantity: 1, unit_price: 5 },
        ],
      })
    ).toEqual({ items_count: 3, total: 44.98 })
  })
})

describe("buildFulfillmentTimeline", () => {
  it("marks waiting as completed when pushed", () => {
    const steps = buildFulfillmentTimeline({
      mcFulfillmentStatus: "pushed",
      fulfillmentOrder: { pushed_at: "2026-05-24T09:00:00.000Z", status: "pushed" },
      latestShipment: null,
      orderCreatedAt: "2026-05-24T08:00:00.000Z",
    })
    expect(steps[0].status).toBe("completed")
    expect(steps[1].status).toBe("completed")
    expect(steps[1].timestamp).toBe("2026-05-24T09:00:00.000Z")
  })

  it("marks shipped step when mc status is shipped", () => {
    const steps = buildFulfillmentTimeline({
      mcFulfillmentStatus: "shipped",
      fulfillmentOrder: { pushed_at: "2026-05-24T09:00:00.000Z", status: "fulfilled" },
      latestShipment: { shipped_at: "2026-05-25T10:00:00.000Z", status: "shipped" },
      orderCreatedAt: "2026-05-24T08:00:00.000Z",
    })
    expect(steps[3].key).toBe("shipped")
    expect(steps[3].status).toBe("completed")
    expect(steps[4].status).toBe("active")
  })

  it("marks delivered only when shipment status and delivered timestamp are both present", () => {
    const withoutEvidence = buildFulfillmentTimeline({
      mcFulfillmentStatus: "delivered",
      fulfillmentOrder: { status: "fulfilled" },
      latestShipment: { shipped_at: "2026-05-25T10:00:00.000Z", status: "shipped" },
    })
    expect(withoutEvidence[4].status).not.toBe("completed")

    const withEvidence = buildFulfillmentTimeline({
      mcFulfillmentStatus: "delivered",
      fulfillmentOrder: { status: "fulfilled" },
      latestShipment: {
        shipped_at: "2026-05-25T10:00:00.000Z",
        delivered_at: "2026-05-27T10:00:00.000Z",
        status: "delivered",
      },
    })
    expect(withEvidence[4].status).toBe("completed")
    expect(withEvidence[4].timestamp).toBe("2026-05-27T10:00:00.000Z")
  })
})
