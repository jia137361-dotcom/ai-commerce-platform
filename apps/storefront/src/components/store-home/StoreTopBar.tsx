import { useEffect, useState } from "react"
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
  const ordersHref = auth.customer ? "/account/orders" : "/orders/lookup"
  const brand = settings.brandName?.trim() || "Store"
  const [path, setPath] = useState(() => (typeof window !== "undefined" ? window.location.pathname : "/"))
  const [hash, setHash] = useState(() => (typeof window !== "undefined" ? window.location.hash : ""))

  useEffect(() => {
    const sync = () => {
      setPath(window.location.pathname)
      setHash(window.location.hash)
    }
    window.addEventListener("popstate", sync)
    window.addEventListener("hashchange", sync)
    window.addEventListener("citigoo:buyer-navigate", sync)
    return () => {
      window.removeEventListener("popstate", sync)
      window.removeEventListener("hashchange", sync)
      window.removeEventListener("citigoo:buyer-navigate", sync)
    }
  }, [])

  // Indie store nav stays identical on Shop / Studio / Orders / Account / Cart.
  // Marketplace chrome is only allowed on the marketplace route itself.
  const showMarketplaceNav = marketplaceMode && path.startsWith("/marketplace")
  const storeHomeHref = "/store"
  const howItWorksHref = "/store#how-it-works"
  const isShop =
    (path === "/store" || path === "/" || path.startsWith("/shops/")) && hash !== "#how-it-works"
  const isAiDesign = path.startsWith("/ai-design") || path.startsWith("/ai-studio")
  const isStudio = path.startsWith("/studio") || path.startsWith("/design")
  const isMyDesigns = path.startsWith("/my-designs")
  const isHowItWorks =
    (path === "/store" || path === "/" || path.startsWith("/shops/")) && hash === "#how-it-works"
  const isOrders = path.startsWith("/account/orders") || path.startsWith("/orders/")

  return (
    <header className="buyer-store-topbar">
      <a className="buyer-store-logo buyer-store-logo--indie" href={storeHomeHref} aria-label={`${brand} home`}>
        {settings.logoUrl ? (
          <img src={settings.logoUrl} alt="" className="buyer-store-logo-img" />
        ) : null}
        <span className="buyer-store-logo-text">{brand}</span>
      </a>
      {!showMarketplaceNav ? (
        <nav className="buyer-store-mainnav" aria-label="Store navigation">
          <a className={isShop ? "active" : ""} href={storeHomeHref}>
            {t("navShop")}
          </a>
          <a className={isAiDesign ? "active" : ""} href="/ai-design">
            {t("navAiDesign")}
          </a>
          <a className={isStudio ? "active" : ""} href="/studio">
            {t("navStudio")}
          </a>
          <a className={isMyDesigns ? "active" : ""} href="/my-designs">
            {t("navMyDesigns")}
          </a>
          <a className={isHowItWorks ? "active" : ""} href={howItWorksHref}>
            {t("navHowItWorks")}
          </a>
          <a className={isOrders ? "active" : ""} href={ordersHref}>
            {t("navOrders")}
          </a>
        </nav>
      ) : (
        <nav className="buyer-store-mainnav" aria-label="Marketplace navigation">
          <a className="active" href="/marketplace">{t("stores")}</a>
        </nav>
      )}
      <div className="buyer-store-actions">
        <a className="buyer-store-me" href={accountHref} aria-label={t("navMe")}>
          <span className="buyer-store-avatar" aria-hidden="true">◎</span>
          <strong>{auth.isLoading ? t("navMe") : auth.customer ? t("navMe") : t("signIn")}</strong>
        </a>
        <button
          className="buyer-store-language"
          type="button"
          aria-label={`Switch language to ${t("localeAlt")}`}
          onClick={toggleLocale}
        >
          {locale === "en" ? t("localeLabel") : t("localeLabel")}
        </button>
        <a className="buyer-store-cart" href="/cart" aria-label={`${t("navCart")} (${cartCount})`}>
          <i aria-hidden="true" />
          <span>{cartCount}</span>
        </a>
      </div>
    </header>
  )
}
