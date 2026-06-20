import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import { MoneyText } from "../ui/MoneyText"
import { StatusBadge } from "../ui/StatusBadge"

export type CheckoutSuccessInfo = { orderId: string; displayId?: string; email?: string | null; total?: number; currencyCode?: string }

export function CheckoutSuccessSummary({ info, isAuthenticated = false }: { info: CheckoutSuccessInfo; isAuthenticated?: boolean }) {
  const orderLabel = info.displayId ? `#${info.displayId}` : info.orderId
  const trackingHref = isAuthenticated ? `/account/orders/${encodeURIComponent(info.orderId)}/tracking` : info.email ? `/account/orders/${encodeURIComponent(info.orderId)}/tracking?${new URLSearchParams({ email: info.email }).toString()}` : undefined
  const detailHref = isAuthenticated ? `/account/orders/${encodeURIComponent(info.orderId)}` : info.email ? `/account/orders/${encodeURIComponent(info.orderId)}?${new URLSearchParams({ email: info.email }).toString()}` : undefined
  return (
    <Card as="section" className="buyer-checkout-success-card">
      <div className="buyer-checkout-success-icon" aria-hidden="true">✓</div>
      <p className="buyer-checkout-success-kicker">Order placed</p>
      <h1>Your order is confirmed</h1>
      <p className="buyer-checkout-success-copy">The order was created successfully. The current local payment flow records authorization only; funds have not been captured.</p>
      <StatusBadge tone="warning" className="buyer-checkout-success-status">Payment authorized · not captured</StatusBadge>
      <dl>
        <div><dt>Order</dt><dd>{orderLabel}</dd></div>
        <div><dt>Email</dt><dd>{info.email ?? "Not provided"}</dd></div>
        <div><dt>Total</dt><dd><MoneyText amount={info.total} currencyCode={info.currencyCode} /></dd></div>
      </dl>
      <div className="buyer-checkout-success-actions">
        {detailHref ? <Button href={detailHref}>View order</Button> : null}
        {trackingHref ? <Button variant="secondary" href={trackingHref}>Track order</Button> : null}
        <Button variant="ghost" href="/store">Continue shopping</Button>
      </div>
      <p className="buyer-checkout-success-note">Cancellation remains subject to the backend order, payment, and fulfillment eligibility checks. This page does not claim payment capture or refund availability.</p>
    </Card>
  )
}
