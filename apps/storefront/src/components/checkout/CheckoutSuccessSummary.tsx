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
  const trackingHref = info.email
    ? `/account/orders/${encodeURIComponent(info.orderId)}/tracking?${new URLSearchParams({
        email: info.email,
        ...(info.displayId ? { display_id: info.displayId } : {}),
      }).toString()}`
    : undefined
  const detailHref = info.email
    ? `/account/orders/${encodeURIComponent(info.orderId)}?${new URLSearchParams({ email: info.email }).toString()}`
    : undefined

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
        {trackingHref ? <a href={trackingHref}>Track order</a> : null}
        {detailHref ? <a href={detailHref}>View order</a> : null}
        <a href="/store">Continue shopping</a>
      </div>
      <p className="buyer-checkout-success-note">
        {info.email
          ? "Order detail and tracking use the email saved on the real backend order record."
          : "This order does not have an email on the backend order record, so email-based tracking is not available yet. Save the order id or display id for support lookup."}
      </p>
    </section>
  )
}
