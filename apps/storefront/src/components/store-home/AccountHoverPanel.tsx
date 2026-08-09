import { useBuyerAuth } from "../../auth/useBuyerAuth"

type AccountHoverPanelProps = {
  onClose?: () => void
}

export function AccountHoverPanel({ onClose }: AccountHoverPanelProps) {
  const auth = useBuyerAuth()
  const signInHref = "/account/sign-in"
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
        <a href="/ai-design" onClick={onClose}>
          AI design
        </a>
        <a href="/ai-design#ai-materials" onClick={onClose}>
          Materials library
        </a>
        <a href="/studio" onClick={onClose}>
          Product selection
        </a>
        <a href="/my-designs" onClick={onClose}>
          Design center
        </a>
        <a href="/trends" onClick={onClose}>
          Trends
        </a>
        <a href="/saved" onClick={onClose}>
          My Saved
        </a>
        <a href="/account/orders" onClick={onClose}>
          Orders
        </a>
        {auth.customer ? (
          <>
            <a href="/account" onClick={onClose}>
              Account overview
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
            <a href="/account/messages" onClick={onClose}>
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
