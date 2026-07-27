type MobileHomeHeaderProps = {
  brandName?: string
  onOpenCategories?: () => void
}

/** Compact brand row only — main links live in StoreSubNav via StoreTopBar. */
export function MobileHomeHeader({ brandName }: MobileHomeHeaderProps) {
  const brand = brandName?.trim() || "ciiverse"

  return (
    <div className="buyer-mhome-header">
      <div className="buyer-mhome-topline">
        <a className="buyer-mhome-brand" href="/store" aria-label={`${brand} home`}>
          {brand}
        </a>
        <a className="buyer-mhome-plans" href="/plans">
          Plans
        </a>
        <a className="buyer-mhome-cart-link" href="/cart" aria-label="Cart">
          Cart
        </a>
      </div>
    </div>
  )
}
