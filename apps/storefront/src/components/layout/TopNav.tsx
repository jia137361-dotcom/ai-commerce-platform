type TopNavProps = {
  onShare?: () => void
  cartCount?: number
}

export function TopNav({ onShare, cartCount = 0 }: TopNavProps) {
  return (
    <header className="top-nav">
      <a className="brand" href="/store" aria-label="Citigoo home">
        <span className="brand-mark">C</span>
        <span>Citigoo</span>
      </a>
      <nav className="nav-links" aria-label="Main navigation">
        <span>Ship to USA</span>
        <a href="/store">Stores</a>
        <a href="/store?tab=category">Locals</a>
      </nav>
      <div className="nav-actions">
        <a href="/account/orders">lulu</a>
        <span>Support</span>
        <span>EN</span>
        <button className="icon-button" type="button" onClick={onShare} title="Share store">
          Share
        </button>
        <a className="cart-pill" href="/cart">Cart {cartCount ? `(${cartCount})` : ""}</a>
      </div>
    </header>
  )
}
