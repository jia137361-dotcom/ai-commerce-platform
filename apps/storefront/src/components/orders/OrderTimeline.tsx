type OrderTimelineProps = {
  delivered?: boolean
}

const steps = ["Order Placed", "Payment Confirmed", "Shipped", "Delivered"]

export function OrderTimeline({ delivered = false }: OrderTimelineProps) {
  return (
    <ol className="timeline">
      {steps.map((step, index) => {
        const complete = delivered || index < 3
        return (
          <li className={complete ? "complete" : ""} key={step}>
            <span>{index + 1}</span>
            <strong>{step}</strong>
          </li>
        )
      })}
    </ol>
  )
}
