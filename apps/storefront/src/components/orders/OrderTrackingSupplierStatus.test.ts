import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { OrderTrackingSupplierStatus } from "./OrderTrackingSupplierStatus"

describe("OrderTrackingSupplierStatus", () => {
  it("renders a real S2BDIY review state without inventing carrier tracking", () => {
    const html = renderToStaticMarkup(createElement(OrderTrackingSupplierStatus, {
      supplierOrders: [{
        id: "so_1",
        supplier: "s2bdiy",
        supplierOrderId: "7116148",
        status: "reviewing",
        statusText: "审核中",
        paymentStatus: "paid",
        paymentStatusText: "支付完成",
        logisticsName: "Platform logistics",
        logisticsStatusText: "waiting",
        trackingNumber: null,
        lastSyncedAt: "2026-06-08T08:12:00.000Z",
      }],
    }))

    expect(html).toContain("Supplier fulfillment progress")
    expect(html).toContain("审核中")
    expect(html).toContain("S2BDIY order-detail API")
    expect(html).toContain("Not available")
    expect(html).toContain("not buyer payment-capture evidence")
    expect(html).not.toContain("In transit")
    expect(html).not.toContain("Delivered")
  })
})
