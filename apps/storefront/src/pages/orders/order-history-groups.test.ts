import { groupOrdersForHistory } from "./order-history-groups"
import type { BuyerOrderSummary } from "../../lib/buyer-api"

const baseOrder = (overrides: Partial<BuyerOrderSummary>): BuyerOrderSummary => ({
  orderId: "order_1",
  displayId: "1001",
  createdAt: "2026-07-01T10:00:00.000Z",
  status: "pending",
  paymentStatus: "authorized",
  fulfillmentStatus: "not_fulfilled",
  itemCount: 1,
  previewItems: [],
  reviewEligible: false,
  receiptConfirmedAt: null,
  returnIntent: false,
  storeId: null,
  platformCheckoutId: null,
  platformCheckoutIndex: null,
  platformCheckoutCount: null,
  ...overrides,
})

describe("groupOrdersForHistory", () => {
  it("groups orders by platform checkout id and keeps singles separate", () => {
    const groups = groupOrdersForHistory([
      baseOrder({
        orderId: "order_a",
        platformCheckoutId: "pc_1",
        platformCheckoutIndex: 0,
        createdAt: "2026-07-02T10:00:00.000Z",
      }),
      baseOrder({
        orderId: "order_b",
        platformCheckoutId: "pc_1",
        platformCheckoutIndex: 1,
        createdAt: "2026-07-02T10:05:00.000Z",
      }),
      baseOrder({
        orderId: "order_solo",
        createdAt: "2026-07-03T10:00:00.000Z",
      }),
    ])

    expect(groups).toHaveLength(2)
    expect(groups[0]).toMatchObject({ kind: "single", key: "order_solo" })
    expect(groups[1]).toMatchObject({
      kind: "platform",
      key: "pc_1",
      orders: [{ orderId: "order_a" }, { orderId: "order_b" }],
    })
  })
})
