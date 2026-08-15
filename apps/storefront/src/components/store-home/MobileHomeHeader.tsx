import { useEffect, useRef, useState } from "react"
import { useBuyerLocale } from "../../lib/locale"

type MobileHomeHeaderProps = {
  brandName?: string
  shipToCountry?: string
  onShipToCountryChange?: (countryCode: string) => void
  shipToOptions?: Array<{ code: string; label: string }>
  stores?: Array<{ storeId: string; name: string; brandName: string; slug: string }>
  currentStoreId?: string
  currentStoreHref?: string
  currentStoreName?: string
  onStoreChange?: (storeId: string) => void
}

export function MobileHomeHeader({
  brandName,
  shipToCountry = "us",
  onShipToCountryChange,
  shipToOptions = [],
  stores = [],
  currentStoreId = "",
  currentStoreHref = "/shops/ciiverse",
  currentStoreName = "All stores",
  onStoreChange,
}: MobileHomeHeaderProps) {
  const brand = brandName?.trim() || "ciiverse"
  const { locale, toggleLocale } = useBuyerLocale()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [menuOpen])

  return (
    <div className="buyer-mhome-header">
      <div className="buyer-mhome-topline">
        <div className="buyer-mhome-plus-wrap" ref={menuRef}>
          <button
            className="buyer-mhome-plus"
            type="button"
            aria-label="Open shopping settings"
            aria-expanded={menuOpen}
            aria-controls="buyer-mobile-home-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            +
          </button>
          {menuOpen ? (
            <nav id="buyer-mobile-home-menu" className="buyer-mhome-plus-menu" aria-label="Shopping settings">
              <a href="/categories" onClick={() => setMenuOpen(false)}>
                <span>Categories</span>
                <small>Product catalog</small>
              </a>
              <a href="/account/country-region" onClick={() => setMenuOpen(false)}>
                <span>Ship to</span>
                <small>United States</small>
              </a>
              <a href="/account/country-region" onClick={() => setMenuOpen(false)}>
                <span>Country &amp; region</span>
                <small>United States</small>
              </a>
              <button
                type="button"
                onClick={() => {
                  toggleLocale()
                  setMenuOpen(false)
                }}
              >
                <span>Language</span>
                <small>{locale === "en" ? "English" : "中文"}</small>
              </button>
              <a href="/account/currency" onClick={() => setMenuOpen(false)}>
                <span>Currency</span>
                <small>USD: $</small>
              </a>
              <a href="/plans" onClick={() => setMenuOpen(false)}>
                <span>Plans</span>
                <small>Plan services</small>
              </a>
            </nav>
          ) : null}
        </div>
        <a className="buyer-mhome-brand" href="/shops/ciiverse" aria-label={`${brand} home`}>
          {brand}
        </a>
        <label className="buyer-mhome-ship">
          <span>Ship to</span>
          <select
            aria-label="Ship to country"
            value={shipToCountry}
            onChange={(event) => onShipToCountryChange?.(event.target.value)}
          >
            {shipToOptions.map((option) => (
              <option key={option.code} value={option.code}>{option.label}</option>
            ))}
          </select>
        </label>
        <div className="buyer-mhome-store-select">
          <a href={currentStoreHref}><span>Stores</span> {currentStoreName}</a>
          <select
            aria-label="Choose store"
            value={currentStoreId}
            onChange={(event) => onStoreChange?.(event.target.value)}
          >
            <option value="marketplace">All</option>
            {stores.map((store) => (
              <option key={store.storeId} value={store.storeId}>
                {store.brandName || store.name}
              </option>
            ))}
          </select>
        </div>
        <a className="buyer-mhome-cart-link" href="/cart" aria-label="Cart">
          Cart
        </a>
      </div>
    </div>
  )
}
