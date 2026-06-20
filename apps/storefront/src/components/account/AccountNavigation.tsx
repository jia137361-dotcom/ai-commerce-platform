import type { BuyerCustomer } from "../../lib/buyer-api"

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
    <aside className="buyer-account-nav">
      <div className="buyer-account-avatar">{display.slice(0, 1).toUpperCase()}</div>
      <strong>{display}</strong>
      <span>{customer.email}</span>
      <nav>
        <a href="/account">Overview</a>
        <a href="/account/profile">Profile</a>
        <a href="/account/orders">Orders</a>
        <button type="button" onClick={onSignOut}>Sign out</button>
        <button type="button" onClick={onSwitchAccount}>Switch account</button>
      </nav>
    </aside>
  )
}
