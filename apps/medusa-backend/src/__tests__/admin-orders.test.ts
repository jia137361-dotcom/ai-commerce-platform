import {
  buildFulfillmentTimeline,
  hydrateAdminOrderFromGraph,
  mergeAdminOrderMetadata,
  parseAdminOrdersListQuery,
  resolveAdminSupplierSummary,
  serializeAdminOrderSummary,
  summarizeAdminOrderRow,
} from "../lib/admin-orders"

describe("serializeAdminOrderSummary", () => {
  it("maps email payment and supplier from loaded order records", () => {
    expect(
      serializeAdminOrderSummary({
        order: {
          id: "order_1",
          email: "buyer@example.com",
          display_id: 8,
          metadata: { payment_status: "paid", payment_method_label: "VISA ···· 4242" },
          shipping_address: { first_name: "Ada", last_name: "Lovelace" },
        },
        fulfillmentOrder: { supplier: "mock", supplier_order_id: "MOCK-SUP-abc", status: "pushed" },
        supplierOrder: null,
      })
    ).toMatchObject({
      email: "buyer@example.com",
      display_id: 8,
      payment_status: "captured",
      payment_method_label: "VISA ···· 4242",
      metadata: { payment_status: "paid", payment_method_label: "VISA ···· 4242" },
      supplier: {
        supplier_id: "mock",
        supplier_order_id: "MOCK-SUP-abc",
      },
    })
  })
})

describe("resolveAdminSupplierSummary", () => {
  it("prefers supplier_order rows but falls back to fulfillment_order", () => {
    expect(
      resolveAdminSupplierSummary(
        { supplier: "mock", supplier_order_id: "MOCK-SUP-abc", status: "pushed" },
        { supplier_id: "s2bdiy", supplier_order_id: "7116148", supplier_status: "paid" }
      )
    ).toEqual({
      supplier_id: "s2bdiy",
      supplier_order_id: "7116148",
      supplier_status: "paid",
    })

    expect(
      resolveAdminSupplierSummary(
        { supplier: "s2bdiy", supplier_order_id: "MOCK-SUP-abc", status: "pushed" },
        null
      )
    ).toEqual({
      supplier_id: "s2bdiy",
      supplier_order_id: "MOCK-SUP-abc",
      supplier_status: "pushed",
    })
  })
})

describe("hydrateAdminOrderFromGraph", () => {
  it("fills email display_id items and metadata from graph when retrieve projection is sparse", () => {
    expect(
      hydrateAdminOrderFromGraph(
        { id: "order_1", items: [], shipping_address: { first_name: "Ada", last_name: "Lovelace" } },
        {
          id: "order_1",
          email: "buyer@example.com",
          display_id: 1001,
          metadata: { payment_status: "paid" },
          items: [{ id: "item_1", title: "Mug", quantity: 1 }],
        }
      )
    ).toEqual({
      id: "order_1",
      email: "buyer@example.com",
      display_id: 1001,
      metadata: { payment_status: "paid" },
      items: [{ id: "item_1", title: "Mug", quantity: 1 }],
      shipping_address: { first_name: "Ada", last_name: "Lovelace" },
    })
  })

  it("keeps retrieveOrder items when graph is empty", () => {
    expect(
      hydrateAdminOrderFromGraph(
        { id: "order_1", items: [{ id: "item_1", quantity: 2 }] },
        { id: "order_1", items: [{ id: "item_2", quantity: 1 }] }
      )
    ).toEqual({
      id: "order_1",
      items: [{ id: "item_1", quantity: 2 }],
      shipping_address: null,
    })
  })
})

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
