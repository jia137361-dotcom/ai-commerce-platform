import { useBuyerAuth } from "../../auth/useBuyerAuth"
import { useBuyerLocale } from "../../lib/locale"
import type { BuyerStoreSettings } from "../../lib/buyer-api"

type StoreTopBarProps = {
  settings: BuyerStoreSettings
  cartCount: number
  marketplaceMode?: boolean
}

export function StoreTopBar({ settings, cartCount, marketplaceMode = false }: StoreTopBarProps) {
  const auth = useBuyerAuth()
  const { locale, toggleLocale, t } = useBuyerLocale()
  const accountHref = auth.customer ? "/account" : "/account/sign-in"
  const accountName = auth.customer?.firstName || auth.customer?.email?.split("@")[0] || t("signIn")
  const accountCaption = auth.customer ? t("ordersAccount") : t("buyerAccount")

  return (
    <header className="buyer-store-topbar">
      <a className="buyer-store-logo" href="/" aria-label="Citigoo home">
        <span>Citi</span>goo
      </a>
      <div className="buyer-store-ship">
        <span aria-hidden="true">⌖</span>
        <div>
          <small>{t("shipTo")}</small>
          <strong>USA</strong>
        </div>
      </div>
      <nav className="buyer-store-mainnav" aria-label="Store navigation">
        <a className={marketplaceMode ? "active" : ""} href="/">{t("stores")}</a>
        {!marketplaceMode ? <a className="active" href={window.location.pathname}>{settings.brandName}</a> : null}
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
          <strong>{t("support")}</strong>
        </a>
        <button
          className="buyer-store-language"
          type="button"
          aria-label={`Switch language to ${t("localeAlt")}`}
          onClick={toggleLocale}
        >
          <span aria-hidden="true" />
          {locale === "en" ? t("localeLabel") : t("localeLabel")}
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
