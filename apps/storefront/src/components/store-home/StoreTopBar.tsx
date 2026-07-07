import { useEffect, useMemo, useRef, useState } from "react"
import { useBuyerAuth } from "../../auth/useBuyerAuth"
import { useBuyerLocale } from "../../lib/locale"
import { fetchShipToRegions, type BuyerShipToRegion, type BuyerStoreSettings } from "../../lib/buyer-api"
import {
  displayRegionFromShipToRegion,
  saveBuyerDisplayRegion,
  useBuyerDisplayRegion,
} from "../../lib/buyer-region-display"

type StoreTopBarProps = {
  settings: BuyerStoreSettings
  cartCount: number
  marketplaceMode?: boolean
}

export function StoreTopBar({ settings, cartCount, marketplaceMode = false }: StoreTopBarProps) {
  const auth = useBuyerAuth()
  const { locale, toggleLocale, t } = useBuyerLocale()
  const displayRegion = useBuyerDisplayRegion()
  const [regions, setRegions] = useState<BuyerShipToRegion[]>([])
  const [regionOpen, setRegionOpen] = useState(false)
  const [regionSearch, setRegionSearch] = useState("")
  const regionPickerRef = useRef<HTMLDivElement | null>(null)
  const accountHref = auth.customer ? "/account" : "/account/sign-in"
  const accountName = auth.customer?.firstName || auth.customer?.email?.split("@")[0] || t("signIn")
  const accountCaption = auth.customer ? t("ordersAccount") : t("buyerAccount")
  const filteredRegions = useMemo(() => {
    const query = regionSearch.trim().toLowerCase()
    if (!query) return regions
    return regions.filter((region) => [
      region.country_region_en,
      region.country_region_zh,
      region.country_code,
      region.abbreviation,
      region.zone,
    ].some((value) => value?.toLowerCase().includes(query)))
  }, [regionSearch, regions])

  useEffect(() => {
    let active = true
    void fetchShipToRegions().then((result) => {
      if (active) setRegions(result.data)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!regionOpen) return undefined
    const onPointerDown = (event: PointerEvent) => {
      if (regionPickerRef.current?.contains(event.target as Node)) return
      setRegionOpen(false)
    }
    window.addEventListener("pointerdown", onPointerDown)
    return () => window.removeEventListener("pointerdown", onPointerDown)
  }, [regionOpen])

  return (
    <header className="buyer-store-topbar">
      <a className="buyer-store-logo" href="/" aria-label="Citigoo home">
        <span>Citi</span>goo
      </a>
      <div className="buyer-store-ship" ref={regionPickerRef}>
        <button
          type="button"
          className="buyer-store-ship-button"
          aria-expanded={regionOpen}
          aria-haspopup="listbox"
          onClick={() => setRegionOpen((open) => !open)}
        >
          <span aria-hidden="true">⌖</span>
          <span>
            <small>{t("shipTo")}</small>
            <strong>{displayRegion.abbreviation || displayRegion.countryCode.toUpperCase()}</strong>
          </span>
          <i aria-hidden="true">⌄</i>
        </button>
        {regionOpen ? (
          <div className="buyer-store-ship-menu">
            <label>
              <span>Search region</span>
              <input
                value={regionSearch}
                placeholder="Search country or region"
                onChange={(event) => setRegionSearch(event.target.value)}
              />
            </label>
            <div className="buyer-store-ship-list" role="listbox" aria-label="Ship to region">
              {filteredRegions.length ? filteredRegions.slice(0, 80).map((region) => {
                const option = displayRegionFromShipToRegion(region)
                const selected = option.countryCode === displayRegion.countryCode
                return (
                  <button
                    key={region.id}
                    type="button"
                    className={selected ? "active" : ""}
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      saveBuyerDisplayRegion(option)
                      setRegionOpen(false)
                      setRegionSearch("")
                    }}
                  >
                    <span>
                      <strong>{option.label}</strong>
                      <small>{[region.zone, region.country_code.toUpperCase(), region.abbreviation].filter(Boolean).join(" / ")}</small>
                    </span>
                    <em>{option.currencyCode}</em>
                  </button>
                )
              }) : <p>No matching regions found.</p>}
            </div>
          </div>
        ) : null}
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
