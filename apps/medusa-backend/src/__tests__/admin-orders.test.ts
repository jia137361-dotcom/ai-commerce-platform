import { buildFulfillmentTimeline, parseAdminOrdersListQuery } from "../lib/admin-orders"

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
  })
})
