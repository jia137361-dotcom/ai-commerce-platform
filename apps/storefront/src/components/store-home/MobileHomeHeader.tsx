type MobileHomeHeaderProps = {
  brandName?: string
  shipToCountry?: string
  onShipToCountryChange?: (countryCode: string) => void
  shipToOptions?: Array<{ code: string; label: string }>
  stores?: Array<{ storeId: string; name: string; brandName: string; slug: string }>
  currentStoreId?: string
  onStoreChange?: (storeId: string) => void
}

export function MobileHomeHeader({
  brandName,
  shipToCountry = "us",
  onShipToCountryChange,
  shipToOptions = [],
  stores = [],
  currentStoreId = "",
  onStoreChange,
}: MobileHomeHeaderProps) {
  const brand = brandName?.trim() || "ciiverse"

  return (
    <div className="buyer-mhome-header">
      <div className="buyer-mhome-topline">
        <a className="buyer-mhome-brand" href="/marketplace" aria-label={`${brand} all stores`}>
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
        <label className="buyer-mhome-store-select">
          <span>Stores</span>
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
        </label>
        <a className="buyer-mhome-cart-link" href="/cart" aria-label="Cart">
          Cart
        </a>
      </div>
    </div>
  )
}
