import type { BuyerSupplierOrderTracking } from "../../lib/buyer-api"
import { Card } from "../ui/Card"
import { StatusBadge } from "../ui/StatusBadge"

const show = (value?: string | null) => value?.trim() || "Not available"

const formatSyncTime = (value?: string | null) => {
  if (!value) return "Not available"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

const statusTone = (status?: string | null) => {
  if (status === "shipped") return "success" as const
  if (status === "cancelled" || status === "failed") return "danger" as const
  return "warning" as const
}

export function OrderTrackingSupplierStatus({ supplierOrders }: { supplierOrders: BuyerSupplierOrderTracking[] }) {
  return (
    <Card as="section" className="buyer-order-card buyer-order-supplier-progress">
      <header>
        <div><p className="buyer-order-kicker">Supplier API</p><h2>Supplier fulfillment progress</h2></div>
        <StatusBadge tone={statusTone(supplierOrders[0]?.status)}>{show(supplierOrders[0]?.statusText ?? supplierOrders[0]?.status)}</StatusBadge>
      </header>
      <p className="buyer-order-supplier-explainer">This status is synchronized from the S2BDIY order-detail API. Carrier milestones appear only after the supplier returns real shipment data.</p>
      <div className="buyer-order-supplier-list">
        {supplierOrders.map((supplierOrder, index) => (
          <dl className="buyer-order-data-grid" key={supplierOrder.id ?? supplierOrder.supplierOrderId ?? index}>
            <div><dt>Supplier order status</dt><dd>{show(supplierOrder.statusText ?? supplierOrder.status)}</dd></div>
            <div><dt>Supplier order reference</dt><dd>{show(supplierOrder.supplierOrderId)}</dd></div>
            <div><dt>Supplier operational payment state</dt><dd>{show(supplierOrder.paymentStatusText ?? supplierOrder.paymentStatus)}</dd></div>
            <div><dt>Logistics channel</dt><dd>{show(supplierOrder.logisticsName)}</dd></div>
            <div><dt>Logistics status</dt><dd>{show(supplierOrder.logisticsStatusText ?? supplierOrder.logisticsStatus)}</dd></div>
            <div><dt>Tracking number</dt><dd>{show(supplierOrder.trackingNumber)}</dd></div>
            <div><dt>Last supplier sync</dt><dd>{formatSyncTime(supplierOrder.lastSyncedAt)}</dd></div>
            <div><dt>Carrier link</dt><dd>{supplierOrder.trackingUrl ? <a href={supplierOrder.trackingUrl} target="_blank" rel="noreferrer">Open tracking document</a> : "Not available"}</dd></div>
          </dl>
        ))}
      </div>
      <p className="buyer-order-supplier-note">Supplier operational payment state is not buyer payment-capture evidence.</p>
    </Card>
  )
}
