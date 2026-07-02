import type { BuyerOrderShipment } from "../../lib/buyer-api"

type OrderTrackingShipmentProps = {
  shipment?: BuyerOrderShipment
}

const show = (value?: string | null) => value?.trim() || "Not available"

export function OrderTrackingShipment({ shipment }: OrderTrackingShipmentProps) {
  return (
    <section className="buyer-order-card buyer-order-shipment">
      <header>
        <p className="buyer-order-kicker">Shipment</p>
        <h2>Tracking information</h2>
      </header>
      <dl className="buyer-order-data-grid">
        <div>
          <dt>Status</dt>
          <dd>{show(shipment?.status)}</dd>
        </div>
        <div>
          <dt>Carrier</dt>
          <dd>{show(shipment?.carrier)}</dd>
        </div>
        <div>
          <dt>Tracking number</dt>
          <dd>{show(shipment?.trackingNumber)}</dd>
        </div>
        <div>
          <dt>Tracking URL</dt>
          <dd>
            {shipment?.trackingUrl ? (
              <a href={shipment.trackingUrl} target="_blank" rel="noreferrer">Open carrier tracking</a>
            ) : (
              "Not available"
            )}
          </dd>
        </div>
      </dl>
    </section>
  )
}
