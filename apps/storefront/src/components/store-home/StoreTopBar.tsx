import { useEffect, useState, type FormEvent } from "react"
import { useBuyerAuth } from "../../auth/useBuyerAuth"
import { useBuyerLocale } from "../../lib/locale"
import {
  fetchMarketplaceStores,
  type BuyerStoreSettings,
  type MarketplaceStore,
  type SupplierCatalogCategory,
} from "../../lib/buyer-api"
import { buildSettingsStoreHref } from "../../lib/storefront-links"
import { AccountHoverPanel } from "./AccountHoverPanel"
import { MobileHomeHeader } from "./MobileHomeHeader"

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

const SHIP_TO_OPTIONS = [
  { code: "us", label: "USA" },
  { code: "cn", label: "China" },
  { code: "ca", label: "Canada" },
  { code: "au", label: "Australia" },
  { code: "gb", label: "UK" },
  { code: "de", label: "Germany" },
  { code: "jp", label: "Japan" },
]

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
  shipToCountry = "us",
  onShipToCountryChange,
  storeHref,
}: StoreTopBarProps) {
  const auth = useBuyerAuth()
  const { locale, toggleLocale, t } = useBuyerLocale()
  const accountHref = auth.customer ? "/account" : "/account/sign-in"
  const brand = settings.brandName?.trim() || "Store"
  const [path, setPath] = useState(() => (typeof window !== "undefined" ? window.location.pathname : "/"))
  const [localSearch, setLocalSearch] = useState("")
  const [stores, setStores] = useState<MarketplaceStore[]>([])
  const currentStoreHref = storeHref ?? buildSettingsStoreHref(settings)

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
  const shipTo = SHIP_TO_OPTIONS.find((option) => option.code === shipToCountry) ?? SHIP_TO_OPTIONS[0]
  const selectedStoreValue =
    stores.find((store) => store.storeId === settings.storeId)?.storeId ??
    (marketplaceMode ? "marketplace" : "")
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
          onShipToCountryChange={onShipToCountryChange}
          shipToOptions={SHIP_TO_OPTIONS}
          stores={stores}
          currentStoreId={selectedStoreValue}
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
                onChange={(event) => onShipToCountryChange?.(event.target.value)}
              >
                {SHIP_TO_OPTIONS.map((option) => (
                  <option key={option.code} value={option.code}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          <label className="buyer-store-selector">
            <span>Stores</span>
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
          </label>

          <span className="buyer-store-topbar-spacer" aria-hidden="true" />

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
            <a className="buyer-store-support" href="/help">
              <span aria-hidden="true" />
              <strong>Support</strong>
            </a>
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
