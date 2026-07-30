import { useEffect, useState, type FormEvent } from "react"
import { useBuyerAuth } from "../../auth/useBuyerAuth"
import { useBuyerLocale } from "../../lib/locale"
import type { BuyerStoreSettings, SupplierCatalogCategory } from "../../lib/buyer-api"
import { AccountHoverPanel } from "./AccountHoverPanel"
import { MobileHomeHeader } from "./MobileHomeHeader"
import { StoreSubNav } from "./StoreSubNav"

type StoreTopBarProps = {
  settings: BuyerStoreSettings
  cartCount: number
  marketplaceMode?: boolean
  searchValue?: string
  onSearchChange?: (value: string) => void
  onSearchSubmit?: () => void
  /** Show search field under mobile brand/nav (store home / search). */
  showMobileSearch?: boolean
  categories?: SupplierCatalogCategory[]
  activeCategoryId?: string
  onCategoryChange?: (categoryId: string) => void
  showCategoryRow?: boolean
}

export function StoreTopBar({
  settings,
  cartCount,
  marketplaceMode = false,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  showMobileSearch = false,
  categories = [],
  activeCategoryId = "all",
  onCategoryChange,
  showCategoryRow = false,
}: StoreTopBarProps) {
  const auth = useBuyerAuth()
  const { locale, toggleLocale, t } = useBuyerLocale()
  const accountHref = auth.customer ? "/account" : "/account/sign-in"
  const brand = settings.brandName?.trim() || "Store"
  const [path, setPath] = useState(() => (typeof window !== "undefined" ? window.location.pathname : "/"))
  const [localSearch, setLocalSearch] = useState("")

  useEffect(() => {
    const sync = () => setPath(window.location.pathname)
    window.addEventListener("popstate", sync)
    window.addEventListener("citigoo:buyer-navigate", sync)
    return () => {
      window.removeEventListener("popstate", sync)
      window.removeEventListener("citigoo:buyer-navigate", sync)
    }
  }, [])

  const showMarketplaceNav = marketplaceMode && path.startsWith("/marketplace")
  const searchTerm = searchValue ?? localSearch
  const handleSearchChange = (value: string) => {
    if (onSearchChange) onSearchChange(value)
    else setLocalSearch(value)
  }

  const submitSearch = (event?: FormEvent) => {
    event?.preventDefault()
    if (onSearchSubmit) {
      onSearchSubmit()
      return
    }
    const term = searchTerm.trim()
    if (!term) return
    window.location.assign(`/search?q=${encodeURIComponent(term)}`)
  }

  const categoryTabs =
    categories.length > 0
      ? [{ id: "all", label: "All" }, ...categories.slice(0, 8).map((c) => ({ id: String(c.id), label: c.enName || c.name }))]
      : [
          { id: "all", label: "All" },
          { id: "tshirt", label: "T-Shirt" },
          { id: "hoodie", label: "Hoodie" },
          { id: "mug", label: "Mug" },
          { id: "phone", label: "Phone Case" },
          { id: "poster", label: "Poster" },
          { id: "canvas", label: "Canvas" },
        ]

  const searchForm = (
    <form className="buyer-mhome-search buyer-mhome-search--chrome" onSubmit={submitSearch}>
      <input
        aria-label={t("catalogSearchPlaceholder")}
        value={searchTerm}
        onChange={(event) => handleSearchChange(event.target.value)}
        placeholder={t("catalogSearchPlaceholder")}
      />
      <button type="submit" aria-label="Search">
        ⌕
      </button>
    </form>
  )

  return (
    <header className="buyer-store-chrome">
      <div className="buyer-chrome-mobile">
        <MobileHomeHeader brandName={brand} />
        {!showMarketplaceNav ? <StoreSubNav className="buyer-store-subnav--mobile" /> : null}
        {showMobileSearch ? searchForm : null}
      </div>

      <div className="buyer-chrome-desktop">
        <div className="buyer-store-topbar buyer-store-topbar--temu">
          <a className="buyer-store-logo buyer-store-logo--indie" href="/store" aria-label={`${brand} home`}>
            {settings.logoUrl ? <img src={settings.logoUrl} alt="" className="buyer-store-logo-img" /> : null}
            <span className="buyer-store-logo-text">{brand}</span>
          </a>

          <a className="buyer-store-ship" href="/account/country-region" aria-label="Change shipping country or region">
            <span aria-hidden="true">📍</span>
            <div>
              <small>Ship to</small>
              <strong>United States</strong>
            </div>
          </a>

          <a className="buyer-store-categories-trigger" href="/categories">
            Categories
          </a>

          <form className="buyer-store-search buyer-store-search--header buyer-store-search--pill" onSubmit={submitSearch}>
            <input
              aria-label={t("catalogSearchPlaceholder")}
              value={searchTerm}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder={t("catalogSearchPlaceholder")}
            />
            <button type="submit" aria-label="Search">
              ⌕
            </button>
          </form>

          <div className="buyer-store-actions buyer-store-actions--temu">
            <div className="buyer-store-account buyer-store-account--dropdown">
              <a href={accountHref} className="buyer-store-account-trigger">
                <span className="buyer-store-avatar" aria-hidden="true">
                  ◎
                </span>
                <div>
                  <small>Orders &amp; Account</small>
                  <strong>{auth.isLoading ? t("navMe") : auth.customer ? t("navMe") : t("signIn")}</strong>
                </div>
              </a>
              <AccountHoverPanel />
            </div>
            <div className="buyer-store-header-menu">
              <a className="buyer-store-support" href="/help">
                <span aria-hidden="true" />
                <strong>Support</strong>
              </a>
              <nav className="buyer-store-header-popover buyer-store-support-popover" aria-label="Support">
                <a href="/help">Support center</a>
                <a href="/help#after-sales">After-sales service</a>
                <a href="/account/messages">Chat with Ciiverse</a>
                <a href="/privacy">Privacy policy</a>
                <a href="/terms">Terms of use</a>
              </nav>
            </div>
            <div className="buyer-store-header-menu">
              <button
                className="buyer-store-language"
                type="button"
                aria-label="Language, currency, and shipping preferences"
              >
                <span aria-hidden="true" />
                {locale === "en" ? "EN" : "中文"}
              </button>
              <div className="buyer-store-header-popover buyer-store-preferences-popover">
                <section>
                  <strong>Language</strong>
                  <button type="button" onClick={toggleLocale}>
                    <span>{locale === "en" ? "English" : "中文"}</span>
                    <small>Change</small>
                  </button>
                </section>
                <section>
                  <strong>Currency</strong>
                  <a href="/account/currency">
                    <span>USD: $</span>
                    <small>Change</small>
                  </a>
                </section>
                <p>You are shopping and shipping to United States.</p>
                <a className="buyer-store-preferences-change" href="/account/country-region">
                  Change country/region
                </a>
              </div>
            </div>
            <a className="buyer-store-cart" href="/cart" aria-label={`${t("navCart")} (${cartCount})`}>
              <i aria-hidden="true" />
              <span>{cartCount}</span>
            </a>
          </div>
        </div>

        {showCategoryRow && !showMarketplaceNav ? (
          <nav className="buyer-store-category-row buyer-store-category-row--temu" aria-label="Store categories">
            {categoryTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={activeCategoryId === tab.id ? "active" : ""}
                onClick={() => onCategoryChange?.(tab.id === "tshirt" || tab.id === "hoodie" ? "all" : tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        ) : null}

        {!showMarketplaceNav ? <StoreSubNav /> : null}
      </div>
    </header>
  )
}
