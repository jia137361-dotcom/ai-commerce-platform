import type { BuyerCustomer } from "../../lib/buyer-api"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"

export function AccountNavigation({
  customer,
  onSignOut,
  onSwitchAccount,
}: {
  customer: BuyerCustomer
  onSignOut: () => void
  onSwitchAccount: () => void
}) {
  const display = [customer.firstName, customer.lastName].filter(Boolean).join(" ") || customer.email || "Account"
  return (
    <Card as="aside" className="buyer-account-nav">
      <div className="buyer-account-nav-user">
        <div className="buyer-account-avatar" aria-hidden="true">{display.slice(0, 1).toUpperCase()}</div>
        <strong>{display}</strong>
        <span>{customer.email || "Email not provided"}</span>
        <small>Buyer account</small>
      </div>
      <nav className="buyer-account-nav-links" aria-label="Buyer account">
        <a href="/account">Overview</a>
        <a href="/account/profile">Profile</a>
        <a href="/account/orders">Orders</a>
        <span className="buyer-account-nav-label">Settings</span>
        <a href="/account/security">Account &amp; Security</a>
        <a href="/account/addresses">Delivery addresses</a>
        <a href="/account/country-region">Country &amp; region</a>
        <a href="/account/currency">Currency</a>
        <a href="/account/coupons">Coupons</a>
        <a href="/account/following">Following</a>
        <Button variant="ghost" onClick={onSwitchAccount}>Switch account</Button>
        <Button variant="ghost" onClick={onSignOut}>Sign out</Button>
      </nav>
    </Card>
  )
}
