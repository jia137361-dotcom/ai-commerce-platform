import type { StoreProduct } from "../../lib/mock-data"

type ProductPurchasePanelProps = {
  product: StoreProduct
  quantity: number
  setQuantity: (quantity: number) => void
  adding: boolean
  addNotice?: string
  onAddToCart: () => void
}

const colorOptions = [
  { label: "Black/Green", value: "Black/Green" },
  { label: "Machine + Frother", value: "Machine + Frother" },
  { label: "Buna Yellow", value: "Buna Yellow" },
]

export function ProductPurchasePanel({
  product,
  quantity,
  setQuantity,
  adding,
  addNotice,
  onAddToCart,
}: ProductPurchasePanelProps) {
  const canAdd = Boolean(product.isCartAddable && product.medusaVariantId)
  const reason = !product.isCartAddable
    ? "This product is not available for cart purchase yet."
    : !product.medusaVariantId
      ? "This product is missing a Medusa variant id."
      : undefined

  return (
    <aside className="buyer-product-purchase">
      <p className="buyer-product-brand">Nespresso</p>
      <h1>{product.title}</h1>
      <div className="buyer-product-score">
        <span aria-label={`${product.averageRating ?? 4.8} stars`}>*****</span>
        <strong>{product.averageRating ? product.averageRating.toFixed(1) : "4.8"}</strong>
        <a href="#reviews">{product.reviewCount ?? 0} reviews</a>
      </div>

      {/* TODO: Replace these visual selectors with backend variants/options once the API exposes them. */}
      <div className="buyer-product-options">
        <label>
          Color ID
          <select value={colorOptions[0].value} onChange={() => undefined}>
            {colorOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label>
          Style (5)
          <select value={colorOptions[1].value} onChange={() => undefined}>
            {colorOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      <strong className="buyer-product-price">{product.price}</strong>
      <p className="buyer-product-delivery">Get it by Thursday, May 28.</p>
      <p className="buyer-product-shipping">Ships from and sold by Nespresso.com.</p>

      <div className="buyer-product-about">
        <strong>About this item</strong>
        <p>{product.description ?? "A curated product with premium presentation, responsive storefront data, and cart-ready fulfillment when the native variant is linked."}</p>
        <button type="button">See More</button>
      </div>

      <div className="buyer-product-quantity">
        <span>Quantity</span>
        <div>
          <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
          <strong>{quantity}</strong>
          <button type="button" onClick={() => setQuantity(quantity + 1)}>+</button>
        </div>
      </div>

      {reason && <p className="buyer-product-disabled-reason">{reason}</p>}
      {addNotice && (
        <p className="buyer-product-toast">
          {addNotice}
          {addNotice.toLowerCase().includes("added") && <a href="/cart">View cart</a>}
        </p>
      )}

      <div className="buyer-product-actions">
        <a href={`/products/${encodeURIComponent(product.id)}`}>See all details</a>
        <button type="button" disabled={!canAdd || adding} onClick={onAddToCart}>
          {adding ? "Adding..." : "Add To Cart"}
        </button>
      </div>
    </aside>
  )
}
