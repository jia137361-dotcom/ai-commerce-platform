import { normalizeSupplierOrderTracking } from "../lib/supplier-order-tracking"

describe("supplier order buyer-safe tracking projection", () => {
  it("exposes review status and logistics state without returning the raw supplier payload", () => {
    const projected = normalizeSupplierOrderTracking({
      id: "so_1",
      supplier_id: "s2bdiy",
      supplier_order_id: "7116148",
      supplier_status: "reviewing",
      supplier_status_text: "审核中",
      supplier_pay_status: "paid",
      supplier_pay_status_text: "支付完成",
      last_synced_at: new Date("2026-06-08T08:12:00.000Z"),
      raw_response_json: {
        private_field: "must-not-leak",
        order_logistics: {
          logistics_name: "Platform logistics",
          logisticss_status: 1,
          logisticss_track_number: "",
        },
      },
    })

    expect(projected).toEqual(expect.objectContaining({
      status: "reviewing",
      status_text: "审核中",
      payment_status: "paid",
      logistics_status_text: "waiting",
      tracking_number: null,
      last_synced_at: "2026-06-08T08:12:00.000Z",
    }))
    expect(projected).not.toHaveProperty("raw_response_json")
    expect(projected).not.toHaveProperty("private_field")
  })
})
