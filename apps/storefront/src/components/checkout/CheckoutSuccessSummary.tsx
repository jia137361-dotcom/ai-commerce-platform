import { formatBuyerMoney } from "../../lib/buyer-api"

export type CheckoutSuccessInfo = {
  orderId: string
  displayId?: string
  email?: string | null
  total?: number
  currencyCode?: string
}

type CheckoutSuccessSummaryProps = {
  info: CheckoutSuccessInfo
}

export function CheckoutSuccessSummary({ info }: CheckoutSuccessSummaryProps) {
  const orderLabel = info.displayId ? `#${info.displayId}` : info.orderId

  return (
    <section className="buyer-checkout-success-card">
      <div className="buyer-checkout-success-icon" aria-hidden="true">✓</div>
      <p className="buyer-checkout-success-kicker">Order placed</p>
      <h1>Thank you for your purchase</h1>
      <p className="buyer-checkout-success-copy">
        We have received your order and will send updates to your contact email.
      </p>
      <dl>
        <div>
          <dt>Order</dt>
          <dd>{orderLabel}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{info.email ?? "Not provided"}</dd>
        </div>
        <div>
          <dt>Total</dt>
          <dd>{formatBuyerMoney(info.total, info.currencyCode)}</dd>
        </div>
      </dl>
      <div className="buyer-checkout-success-actions">
        <a href={`/account/orders/${encodeURIComponent(info.orderId)}`}>View order</a>
        <a href="/store">Continue shopping</a>
      </div>
      <p className="buyer-checkout-success-note">
        Order detail is currently routed to the existing account order placeholder until the buyer order detail API is completed.
      </p>
    </section>
  )
}
