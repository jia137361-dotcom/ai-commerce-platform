import { useBuyerAuth } from "../../auth/useBuyerAuth"
import { buildStoreMessagesHref } from "../../lib/storefront-links"

type AccountHoverPanelProps = {
  onClose?: () => void
}

export function AccountHoverPanel({ onClose }: AccountHoverPanelProps) {
  const auth = useBuyerAuth()
  const signInHref = "/account/sign-in"
  const messagesHref = buildStoreMessagesHref()
  const handleSignOut = (redirectTo: string) => {
    onClose?.()
    void auth.signOut().then(() => window.location.assign(redirectTo))
  }

  return (
    <div className="buyer-account-panel buyer-account-panel--account" role="menu">
      <section className="buyer-account-panel-links">
        <header>
          <strong>{auth.customer?.email ?? "Buyer account"}</strong>
          <span>{auth.customer ? "Manage your Ciiverse account" : "Sign in to sync orders and saved items"}</span>
        </header>
        {auth.customer ? (
          <>
            <a href="/account" onClick={onClose}>
              Account overview
            </a>
            <a href="/account/orders" onClick={onClose}>
              Orders
            </a>
            <a href="/my-designs" onClick={onClose}>
              My Designs
            </a>
            <a href="/account/profile" onClick={onClose}>
              Profile
            </a>
            <a href="/account/addresses" onClick={onClose}>
              Addresses
            </a>
            <a href="/account/security" onClick={onClose}>
              Account security
            </a>
            <a href={messagesHref} onClick={onClose}>
              Notifications
            </a>
            <button type="button" onClick={() => handleSignOut("/account/sign-in")}>
              Switch account
            </button>
            <button type="button" className="buyer-account-panel-signout" onClick={() => handleSignOut("/store")}>
              Log out
            </button>
          </>
        ) : (
          <>
            <a href={signInHref} onClick={onClose}>
              Sign in
            </a>
            <a href="/account/register" onClick={onClose}>
              Create account
            </a>
          </>
        )}
      </section>
    </div>
  )
}
