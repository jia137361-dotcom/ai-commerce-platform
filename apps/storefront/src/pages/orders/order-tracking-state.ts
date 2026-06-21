import type { BuyerOrderTracking } from "../../lib/buyer-api"

export const hasOrderTrackingData = (tracking?: BuyerOrderTracking | null) => {
  if (!tracking) return false
  if (tracking.events.length > 0) return true
  if (tracking.supplierOrders.length > 0) return true
  if (tracking.fulfillmentOrder) return true
  return tracking.shipments.some((shipment) => Boolean(
    shipment.status ||
    shipment.carrier ||
    shipment.trackingNumber ||
    shipment.trackingUrl ||
    shipment.shippedAt ||
    shipment.deliveredAt
  ))
}
