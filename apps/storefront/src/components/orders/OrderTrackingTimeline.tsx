import type { BuyerOrderTracking } from "../../lib/buyer-api"

type OrderTrackingTimelineProps = {
  events: BuyerOrderTracking["events"]
}

const formatEventDate = (value?: string | null) => {
  if (!value) return "Not available"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

export function OrderTrackingTimeline({ events }: OrderTrackingTimelineProps) {
  return (
    <section className="buyer-order-card buyer-order-timeline">
      <header>
        <p className="buyer-order-kicker">Timeline</p>
        <h2>Delivery events</h2>
      </header>
      {events.length ? (
        <ol className="buyer-order-timeline-list">
          {events.map((event, index) => (
            <li className="buyer-order-timeline-event" key={`${event.label}-${event.date ?? index}`}>
              <span className="buyer-order-timeline-dot" aria-hidden="true" />
              <div>
                <h3>{event.label}</h3>
                <p>{formatEventDate(event.date)}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="buyer-order-muted">Not available</p>
      )}
    </section>
  )
}
