import { useEffect, useState, type FormEvent } from "react"
import { useBuyerAuth } from "../../auth/useBuyerAuth"
import { useBuyerLocale } from "../../lib/locale"
import {
  fetchMarketplaceStores,
  type BuyerStoreSettings,
  type MarketplaceStore,
  type SupplierCatalogCategory,
} from "../../lib/buyer-api"
import { buildSettingsStoreHref, buildStoreMessagesHref } from "../../lib/storefront-links"
import { AccountHoverPanel } from "./AccountHoverPanel"
import { BrowseHistoryPanel } from "./BrowseHistoryPanel"
import { FeatureMenuPanel } from "./FeatureMenuPanel"
import { MobileHomeHeader } from "./MobileHomeHeader"
import { CHECKOUT_COUNTRIES } from "../../pages/checkout/checkout-countries"
import { useBuyerDisplayPreferences, writeBuyerDisplayPreferences } from "../../lib/buyer-display-preferences"

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
  shipToCountry?: string
  onShipToCountryChange?: (countryCode: string) => void
  storeHref?: string
}

const SHIP_TO_OPTIONS = CHECKOUT_COUNTRIES.map((country) => ({ code: country.code, label: country.name }))

const CitigooLogo = () => (
  <span className="buyer-platform-logo">
    <span>Citi</span>
    <strong>goo</strong>
  </span>
)

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
  shipToCountry = "",
  onShipToCountryChange,
  storeHref,
}: StoreTopBarProps) {
  const auth = useBuyerAuth()
  const displayPreferences = useBuyerDisplayPreferences()
  const { locale, toggleLocale, t } = useBuyerLocale()
  const accountHref = auth.customer ? "/account" : "/account/sign-in"
  const brand = settings.brandName?.trim() || "Store"
  const [path, setPath] = useState(() => (typeof window !== "undefined" ? window.location.pathname : "/"))
  const [localSearch, setLocalSearch] = useState("")
  const [stores, setStores] = useState<MarketplaceStore[]>([])
  const currentStoreHref = storeHref ?? buildSettingsStoreHref(settings)
  const storeMessagesHref = buildStoreMessagesHref(settings.storeId)
  const accountMessagesHref = auth.customer
    ? storeMessagesHref
    : `/account/sign-in?returnTo=${encodeURIComponent(storeMessagesHref)}`

  useEffect(() => {
    const sync = () => setPath(window.location.pathname)
    window.addEventListener("popstate", sync)
    window.addEventListener("citigoo:buyer-navigate", sync)
    return () => {
      window.removeEventListener("popstate", sync)
      window.removeEventListener("citigoo:buyer-navigate", sync)
    }
  }, [])

  useEffect(() => {
    let active = true
    void fetchMarketplaceStores().then((result) => {
      if (active) setStores(result.data)
    })
    return () => {
      active = false
    }
  }, [])

  const showMarketplaceNav = marketplaceMode && path.startsWith("/marketplace")
  const resolvedShipToCountry = shipToCountry || displayPreferences.countryCode
  const shipTo = SHIP_TO_OPTIONS.find((option) => option.code === resolvedShipToCountry) ?? SHIP_TO_OPTIONS[0]
  const selectedStoreValue =
    stores.find((store) => store.storeId === settings.storeId)?.storeId ??
    (marketplaceMode ? "marketplace" : "")
  const selectedStore = stores.find((store) => store.storeId === selectedStoreValue)
  const selectedStoreHref = selectedStore?.slug
    ? `/shops/${encodeURIComponent(selectedStore.slug)}`
    : selectedStoreValue === "marketplace"
      ? "/marketplace"
      : currentStoreHref
  const selectedStoreName = selectedStore?.brandName || selectedStore?.name || (marketplaceMode ? "All stores" : brand)
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
    const params = new URLSearchParams({ q: term })
    if (marketplaceMode) {
      window.location.assign(`/marketplace?${params.toString()}`)
      return
    }
    const separator = currentStoreHref.includes("?") ? "&" : "?"
    window.location.assign(`${currentStoreHref}${separator}${params.toString()}`)
  }

  const openStore = (storeId: string) => {
    if (!storeId) return
    if (storeId === "marketplace") {
      window.location.assign("/marketplace")
      return
    }
    const store = stores.find((candidate) => candidate.storeId === storeId)
    const href = store?.slug
      ? `/shops/${encodeURIComponent(store.slug)}`
      : `/store?store_id=${encodeURIComponent(storeId)}`
    window.location.assign(href)
  }

  const updateShipTo = (countryCode: string) => {
    writeBuyerDisplayPreferences({ countryCode })
    onShipToCountryChange?.(countryCode)
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
        <MobileHomeHeader
          brandName="Citigoo"
          shipToCountry={shipTo.code}
          onShipToCountryChange={updateShipTo}
          shipToOptions={SHIP_TO_OPTIONS}
          stores={stores}
          currentStoreId={selectedStoreValue}
          currentStoreHref={selectedStoreHref}
          currentStoreName={selectedStoreName}
          onStoreChange={openStore}
        />
        {showMobileSearch ? searchForm : null}
      </div>

      <div className="buyer-chrome-desktop">
        <div className="buyer-store-topbar buyer-store-topbar--temu">
          <a className="buyer-store-logo buyer-store-logo--indie" href="/marketplace" aria-label="Citigoo all stores">
            <CitigooLogo />
          </a>

          <div className="buyer-store-ship" aria-label="Ship to">
            <span aria-hidden="true">⌖</span>
            <div>
              <small>Ship to</small>
              <select
                aria-label="Ship to country"
                value={shipTo.code}
                onChange={(event) => updateShipTo(event.target.value)}
              >
                {SHIP_TO_OPTIONS.map((option) => (
                  <option key={option.code} value={option.code}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="buyer-store-selector">
            <a href={selectedStoreHref} aria-label={`Open ${selectedStoreName} store`}>
              <span>Stores</span>
              <strong>{selectedStoreName}</strong>
            </a>
            <select
              aria-label="Choose store"
              value={selectedStoreValue}
              onChange={(event) => openStore(event.target.value)}
            >
              <option value="marketplace">All stores</option>
              {stores.map((store) => (
                <option key={store.storeId} value={store.storeId}>
                  {store.brandName || store.name}
                </option>
              ))}
            </select>
          </div>

          <span className="buyer-store-topbar-spacer" aria-hidden="true" />

          <div className="buyer-store-actions buyer-store-actions--temu">
            <div className="buyer-store-account buyer-store-account--dropdown buyer-store-history">
              <a href="/marketplace" className="buyer-store-icon-trigger" aria-label="Browsing history">
                <span className="buyer-store-history-icon" aria-hidden="true" />
              </a>
              <BrowseHistoryPanel />
            </div>
            <a href={accountMessagesHref} className="buyer-store-icon-trigger buyer-store-message" aria-label={`Message ${brand}`}>
              <span className="buyer-store-message-icon" aria-hidden="true" />
            </a>
            <div className="buyer-store-account buyer-store-account--dropdown buyer-store-features">
              <button className="buyer-store-icon-trigger" type="button" aria-label="Open feature menu">
                <span className="buyer-store-feature-icon" aria-hidden="true" />
              </button>
              <FeatureMenuPanel />
            </div>
            <button
              className="buyer-store-language"
              type="button"
              aria-label={`Switch language to ${t("localeAlt")}`}
              onClick={toggleLocale}
            >
              <span aria-hidden="true" />
              {locale === "en" ? "EN" : "中文"}
            </button>
            <a className="buyer-store-cart" href="/cart" aria-label={`${t("navCart")} (${cartCount})`}>
              <i aria-hidden="true" />
              <span>{cartCount}</span>
            </a>
            <div className="buyer-store-account buyer-store-account--dropdown buyer-store-account--right">
              <a href={accountHref} className="buyer-store-account-trigger" aria-label="Account menu">
                <span className="buyer-store-avatar" aria-hidden="true">
                  <span />
                </span>
              </a>
              <AccountHoverPanel />
            </div>
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

      </div>
    </header>
  )
}
