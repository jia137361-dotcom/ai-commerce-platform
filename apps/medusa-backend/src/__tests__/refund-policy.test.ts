import { evaluateRefundPolicy, resolveProductionStatus } from "../lib/refund-policy"
import type { CancellationContext } from "../lib/order-cancellation"

const context = (productionStatus: string): CancellationContext => ({
  order: {
    id: "order_1",
    metadata: { store_id: "default_store" },
    payment_collections: [],
    fulfillments: [],
  },
  paymentStateResolved: true,
  fulfillmentStateResolved: true,
  customFulfillmentOrders: [{ status: productionStatus }],
})

describe("refund policy", () => {
  it.each([
    ["not_submitted", "auto_approve"],
    ["accepted", "manual_review"],
    ["in_production", "manual_review"],
    ["production_complete", "manual_review"],
    ["shipped", "return"],
    ["unknown", "manual_review"],
  ])("maps %s to %s", (status, expected) => {
    expect(evaluateRefundPolicy({ context: context(status), paymentCaptured: true }).decision).toBe(expected)
  })

  it("requires explicit supplier cancellation before auto-refunding submitted work", () => {
    expect(evaluateRefundPolicy({ context: context("submitted"), paymentCaptured: true }).decision).toBe("manual_review")
    expect(evaluateRefundPolicy({ context: context("submitted"), paymentCaptured: true, supplierCancellationConfirmed: true }).decision).toBe("auto_approve")
  })

  it("sends delivered damage to claim and ordinary delivery to return", () => {
    expect(evaluateRefundPolicy({ context: context("delivered"), paymentCaptured: true, reason: "damaged" }).decision).toBe("claim")
    expect(evaluateRefundPolicy({ context: context("delivered"), paymentCaptured: true, reason: "changed_mind" }).decision).toBe("return")
  })

  it("fails closed when production evidence is absent", () => {
    expect(resolveProductionStatus(context("not-a-real-status"))).toBe("unknown")
  })

  it("treats waiting as not submitted and ignores unverified production metadata", () => {
    expect(resolveProductionStatus(context("waiting"))).toBe("not_submitted")
    expect(resolveProductionStatus({
      ...context("waiting"),
      order: {
        ...context("waiting").order,
        metadata: { store_id: "default_store", production_status: "in_production" },
      },
      customFulfillmentOrders: [],
    })).toBe("unknown")
  })
})
