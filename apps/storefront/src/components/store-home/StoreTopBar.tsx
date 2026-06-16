import { useBuyerAuth } from "../../auth/useBuyerAuth"
import type { BuyerStoreSettings } from "../../lib/buyer-api"

type StoreTopBarProps = {
  settings: BuyerStoreSettings
  cartCount: number
}

export function StoreTopBar({ settings, cartCount }: StoreTopBarProps) {
  const auth = useBuyerAuth()
  const accountHref = auth.customer ? "/account" : "/account/sign-in"
  const accountName = auth.customer?.firstName || auth.customer?.email?.split("@")[0] || "Sign in"
  const accountCaption = auth.customer ? "Orders & Account" : "Buyer Account"

  return (
    <header className="buyer-store-topbar">
      <a className="buyer-store-logo" href="/store" aria-label="Citigoo home">
        <span>Citi</span>goo
      </a>
      <div className="buyer-store-ship">
        <span aria-hidden="true">⌖</span>
        <div>
          <small>Ship to</small>
          <strong>USA</strong>
        </div>
      </div>
      <nav className="buyer-store-mainnav" aria-label="Store navigation">
        <a className="active" href="/store">Stores</a>
        <a href="/store?tab=locals">Locals</a>
      </nav>
      <div className="buyer-store-actions">
        <a className="buyer-store-account" href={accountHref}>
          <span className="buyer-store-avatar">◎</span>
          <span>
            <strong>{auth.isLoading ? "Account" : accountName}</strong>
            <small>{accountCaption}</small>
          </span>
        </a>
        <a className="buyer-store-support" href="/help">
          <span aria-hidden="true">▱</span>
          <strong>Support</strong>
        </a>
        <button className="buyer-store-language" type="button">
          <span aria-hidden="true" />
          EN
        </button>
        <a className="buyer-store-cart" href="/cart" aria-label={`Cart with ${cartCount} items`}>
          <i aria-hidden="true" />
          <span>{cartCount}</span>
        </a>
      </div>
      {settings.logoUrl && <img className="buyer-store-hidden-logo" src={settings.logoUrl} alt="" />}
    </header>
  )
}
