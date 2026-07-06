import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import { MoneyText } from "../ui/MoneyText"
import { StatusBadge } from "../ui/StatusBadge"
import type { StoreCart } from "../../lib/mock-data"

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
  shippingAddress?: StoreCart["shippingAddress"]
  items?: StoreCart["items"]
}

const resolvePaymentMethodDisplay = (info: CheckoutSuccessInfo) => {
  if (info.paymentMethodLabel?.trim()) return info.paymentMethodLabel.trim()
  if (info.paymentProviderId?.startsWith("pp_stripe_")) return "Card or wallet (Stripe)"
  if (info.paymentProviderId === "pp_system_default") return "Development authorization"
  return info.paymentProviderId ?? "Not provided"
}

export function CheckoutSuccessSummary({ info, isAuthenticated = false }: { info: CheckoutSuccessInfo; isAuthenticated?: boolean }) {
  const orderLabel = info.displayId ? `#${info.displayId}` : info.orderId
  const detailHref = isAuthenticated ? `/account/orders/${encodeURIComponent(info.orderId)}` : info.email ? `/account/orders/${encodeURIComponent(info.orderId)}?${new URLSearchParams({ email: info.email }).toString()}` : undefined
  const stripePayment = info.paymentProviderId?.startsWith("pp_stripe_")
  const returnedPaymentStatus = typeof info.paymentStatus === "string" ? info.paymentStatus : undefined
  const paymentMethodDisplay = resolvePaymentMethodDisplay(info)
  const address = info.shippingAddress
  const addressLines = address ? [
    [address.firstName, address.lastName].filter(Boolean).join(" "),
    address.address1,
    address.address2,
    [address.city, address.province, address.postalCode].filter(Boolean).join(", "),
    address.countryCode?.toUpperCase(),
  ].filter(Boolean) : []
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
      <div className="buyer-checkout-success-details">
        <section>
          <h2>Shipping address</h2>
          <p>{addressLines.length ? addressLines.map((line) => <span key={line}>{line}<br /></span>) : "Not provided"}</p>
        </section>
        <section>
          <h2>Items</h2>
          <div className="buyer-checkout-success-items">
            {(info.items ?? []).map((item) => (
              <article key={item.id}>
                <div>{item.imageUrl ? <img src={item.imageUrl} alt="" /> : <span>No image</span>}</div>
                <span><strong>{item.title}</strong><small>Qty {item.quantity}{item.variantTitle ? ` · ${item.variantTitle}` : ""}</small></span>
                <MoneyText amount={item.total} currencyCode={info.currencyCode} />
              </article>
            ))}
            {!(info.items ?? []).length ? <p>Order items will be available on the order detail page.</p> : null}
          </div>
        </section>
      </div>
      <div className="buyer-checkout-success-actions">
        {detailHref ? <Button href={detailHref}>View order</Button> : null}
        <Button variant="ghost" href="/">Continue shopping</Button>
      </div>
      <p className="buyer-checkout-success-note">Cancellation remains subject to backend payment and fulfillment checks. This page never derives paid/captured state from frontend-only confirmation.</p>
    </Card>
  )
}
