import { Card } from "../ui/Card"

export function AccountCouponsEmpty() {
  return <Card as="section" className="buyer-account-settings-panel"><header><a href="/account" aria-label="Back to account">←</a><h1>My coupons</h1></header><div className="buyer-account-empty-state"><span aria-hidden="true">%</span><h2>No coupons available</h2><p>Your eligible coupons will appear here when the marketplace coupon service is enabled.</p></div></Card>
}
