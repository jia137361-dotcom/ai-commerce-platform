import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import { MoneyText } from "../ui/MoneyText"
import { StatusBadge } from "../ui/StatusBadge"

export type CheckoutSuccessInfo = {
  orderId: string
  displayId?: string
  email?: string | null
  total?: number
  currencyCode?: string
  paymentProviderId?: string
  paymentMethodLabel?: string | null
  paymentStatus?: unknown
  platformCheckoutId?: string
  platformCheckoutIndex?: number
  platformCheckoutCount?: number
  storeId?: string
}

const resolvePaymentMethodDisplay = (info: CheckoutSuccessInfo) => {
  if (info.paymentMethodLabel?.trim()) return info.paymentMethodLabel.trim()
  if (info.paymentProviderId?.startsWith("pp_stripe_")) return "Card or wallet (Stripe)"
  if (info.paymentProviderId === "pp_system_default") return "Development authorization"
  return info.paymentProviderId ?? "Not provided"
}

export function CheckoutSuccessSummary({ info, isAuthenticated = false }: { info: CheckoutSuccessInfo; isAuthenticated?: boolean }) {
  const orderLabel = info.displayId ? `#${info.displayId}` : info.orderId
  const trackingHref = isAuthenticated ? `/account/orders/${encodeURIComponent(info.orderId)}/tracking` : info.email ? `/account/orders/${encodeURIComponent(info.orderId)}/tracking?${new URLSearchParams({ email: info.email }).toString()}` : undefined
  const detailHref = isAuthenticated ? `/account/orders/${encodeURIComponent(info.orderId)}` : info.email ? `/account/orders/${encodeURIComponent(info.orderId)}?${new URLSearchParams({ email: info.email }).toString()}` : undefined
  const stripePayment = info.paymentProviderId?.startsWith("pp_stripe_")
  const returnedPaymentStatus = typeof info.paymentStatus === "string" ? info.paymentStatus : undefined
  const paymentMethodDisplay = resolvePaymentMethodDisplay(info)
  return (
    <Card as="section" className="buyer-checkout-success-card">
      <div className="buyer-checkout-success-icon" aria-hidden="true">✓</div>
      <p className="buyer-checkout-success-kicker">Order placed</p>
      <h1>Your order is confirmed</h1>
      <p className="buyer-checkout-success-copy">{stripePayment ? "The order was created after Stripe confirmation. Payment truth remains the backend/webhook-reconciled status below." : "The order was created successfully. The local fallback records authorization only; funds have not been captured."}</p>
      <StatusBadge tone={stripePayment ? "success" : "warning"} className="buyer-checkout-success-status">{stripePayment ? `Stripe · ${returnedPaymentStatus ?? "status pending reconciliation"}` : "Payment authorized · not captured"}</StatusBadge>
      <dl>
        <div><dt>Order</dt><dd>{orderLabel}</dd></div>
        <div><dt>Email</dt><dd>{info.email ?? "Not provided"}</dd></div>
        <div><dt>Total</dt><dd><MoneyText amount={info.total} currencyCode={info.currencyCode} /></dd></div>
        <div><dt>Payment method</dt><dd>{paymentMethodDisplay}</dd></div>
      </dl>
      <div className="buyer-checkout-success-actions">
        {detailHref ? <Button href={detailHref}>View order</Button> : null}
        {trackingHref ? <Button variant="secondary" href={trackingHref}>Track order</Button> : null}
        <Button variant="ghost" href="/store">Continue shopping</Button>
      </div>
      <p className="buyer-checkout-success-note">Cancellation remains subject to backend payment and fulfillment checks. This page never derives paid/captured state from frontend-only confirmation.</p>
    </Card>
  )
}
