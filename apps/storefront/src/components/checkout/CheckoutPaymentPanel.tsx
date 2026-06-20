import { Card } from "../ui/Card"
import { StatusBadge } from "../ui/StatusBadge"

export function CheckoutPaymentPanel() {
  return (
    <Card as="section" className="buyer-checkout-card buyer-checkout-payment-card">
      <header><div><p>Step 4</p><h2>Payment authorization</h2></div><StatusBadge tone="warning">Authorize only</StatusBadge></header>
      <div className="buyer-checkout-payment-message">
        <strong>System payment provider</strong>
        <p>The current local provider authorizes payment when the order is placed. It does not capture funds in this runtime.</p>
        <dl><div><dt>Provider</dt><dd>pp_system_default</dd></div><div><dt>Capture</dt><dd>Not available</dd></div></dl>
      </div>
    </Card>
  )
}
