export type ShipmentTrackingEventInput = {
  status?: string | null
  shippedAt?: string | null
  deliveredAt?: string | null
}

export type ShipmentTrackingEvent = {
  label: string
  date?: string | null
  status?: string | null
}

export const buildShipmentTrackingEvents = (
  shipments: ShipmentTrackingEventInput[]
): ShipmentTrackingEvent[] => {
  const events: ShipmentTrackingEvent[] = []
  for (const shipment of shipments) {
    if (shipment.shippedAt) {
      events.push({ label: "Shipped", date: shipment.shippedAt, status: shipment.status })
    }
    if (shipment.status === "delivered" && shipment.deliveredAt) {
      events.push({ label: "Delivered", date: shipment.deliveredAt, status: "delivered" })
    }
  }
  return events
}
