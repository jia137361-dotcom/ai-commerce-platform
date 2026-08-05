import type { BuyerProductVariant, StoreProduct } from "../../lib/mock-data"
import type { ProductPurchaseState } from "../../pages/product/product-detail-state"
import { formatProductRegionNames } from "../../pages/product/product-regions"
import type { BuyerShareInfo } from "../../lib/buyer-api"
import { ProductSharePanel } from "./ProductSharePanel"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import { MoneyText } from "../ui/MoneyText"
import { SelectField } from "../ui/SelectField"
import { StatusBadge } from "../ui/StatusBadge"

type ProductPurchasePanelProps = {
  product: StoreProduct
  variants: BuyerProductVariant[]
  selectedVariantId?: string
  onVariantChange: (variantId: string) => void
  purchaseState: ProductPurchaseState
  quantity: number
  setQuantity: (quantity: number) => void
  adding: boolean
  authLoading?: boolean
  requiresSignIn?: boolean
  addNotice?: { tone: "success" | "error"; message: string }
  onAddToCart: () => void
  onBuyNow: () => void
  share?: BuyerShareInfo | null
  isFavorited?: boolean
  onToggleFavorite?: () => void
  favoriteLoading?: boolean
  designHref?: string
}

export function ProductPurchasePanel({
  product,
  variants,
  selectedVariantId,
  onVariantChange,
  purchaseState,
  quantity,
  setQuantity,
  adding,
  authLoading = false,
  requiresSignIn = false,
  addNotice,
  onAddToCart,
  onBuyNow,
  share,
  isFavorited = false,
  onToggleFavorite,
  favoriteLoading = false,
  designHref,
}: ProductPurchasePanelProps) {
  const reviewCount = product.reviewCount ?? 0
  const editorHref = designHref

  return (
    <Card as="aside" className="buyer-product-purchase">
      <div className="buyer-product-purchase-heading">
        <p>{product.category || "Uncategorized"}</p>
        <div className="buyer-product-heading-actions">
          <StatusBadge tone={purchaseState.availabilityTone}>{purchaseState.availabilityLabel}</StatusBadge>
          {onToggleFavorite ? (
            <button
              type="button"
              className={`buyer-favorite-button ${isFavorited ? "favorited" : ""}`}
              onClick={onToggleFavorite}
              disabled={favoriteLoading}
              aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
            >
              {favoriteLoading ? "..." : isFavorited ? "♥" : "♡"}
            </button>
          ) : null}
        </div>
      </div>
      <h1>{product.title}</h1>
      <div className="buyer-product-score">
        {product.averageRating != null ? (
          <>
            <span aria-hidden="true">★</span>
            <strong>{product.averageRating.toFixed(1)}</strong>
            <a href="#pdp-review">{reviewCount} reviews</a>
          </>
        ) : (
          <a href="#pdp-review">No reviews yet</a>
        )}
      </div>

      <MoneyText amount={product.numericPrice} currencyCode="USD" unavailableLabel="Price unavailable" className="buyer-product-price" />

      {variants.length > 1 ? (
        <SelectField label="Size" value={selectedVariantId ?? ""} onChange={(event) => onVariantChange(event.target.value)}>
          {variants.map((variant) => (
            <option key={variant.id} value={variant.id}>
              {variant.title}
            </option>
          ))}
        </SelectField>
      ) : variants.length === 1 ? (
        <div className="buyer-product-option-unavailable">
          <strong>Size</strong>
          <span>{variants[0].title || "Default option"}</span>
        </div>
      ) : (
        <div className="buyer-product-option-unavailable">
          <strong>Size</strong>
          <span>Visual selector only — variant contract pending backend options.</span>
        </div>
      )}

      <div className="buyer-product-quantity">
        <span>Quantity</span>
        <div>
          <Button variant="ghost" ariaLabel="Decrease quantity" disabled={quantity <= 1 || adding} onClick={() => setQuantity(Math.max(1, quantity - 1))}>
            −
          </Button>
          <strong aria-live="polite">{quantity}</strong>
          <Button variant="ghost" ariaLabel="Increase quantity" disabled={quantity >= 99 || adding} onClick={() => setQuantity(Math.min(99, quantity + 1))}>
            +
          </Button>
        </div>
      </div>

      {!purchaseState.canAdd && purchaseState.reason ? <p className="buyer-product-disabled-reason">{purchaseState.reason}</p> : null}
      {addNotice ? (
        <p className={`buyer-product-add-notice ${addNotice.tone}`} role={addNotice.tone === "error" ? "alert" : "status"}>
          {addNotice.message}
          {addNotice.tone === "success" ? <a href="/cart">View cart</a> : null}
        </p>
      ) : null}

      {editorHref ? (
        <a href={editorHref} className="buyer-product-design-primary">
          Design now
        </a>
      ) : null}

      <Button
        className="buyer-product-add-button buyer-product-add-button--secondary"
        loading={adding || authLoading}
        disabled={!purchaseState.canAdd || adding || authLoading}
        onClick={onAddToCart}
      >
        {authLoading ? "Checking account..." : adding ? "Adding..." : requiresSignIn ? "Sign in to add to cart" : "Add to cart"}
      </Button>
      <Button
        className="buyer-product-add-button"
        variant="primary"
        loading={adding || authLoading}
        disabled={!purchaseState.canAdd || adding || authLoading}
        onClick={onBuyNow}
      >
        {authLoading ? "Checking account..." : adding ? "Preparing checkout..." : requiresSignIn ? "Sign in to buy now" : "Buy now"}
      </Button>

      <div className="buyer-product-action-buttons">
        {product.id && product.hasDesigner ? (
          <>
            <a href={editorHref} className="buyer-action-button buyer-action-editor">
              <span className="buyer-action-icon">🎨</span>
              <span className="buyer-action-text">
                <strong>Studio</strong>
                <small>Place artwork on this blank</small>
              </span>
            </a>
            <a
              href={`/ai-design?productId=${encodeURIComponent(product.id)}&returnTo=${encodeURIComponent(editorHref ?? `/design/${product.id}`)}`}
              className="buyer-action-button buyer-action-ai"
            >
              <span className="buyer-action-icon">✨</span>
              <span className="buyer-action-text">
                <strong>AI Design</strong>
                <small>Generate artwork materials</small>
              </span>
            </a>
          </>
        ) : null}
      </div>
      {requiresSignIn ? (
        <p className="buyer-product-checkout-note">Browsing is open to everyone. Sign in before adding this option to your cart.</p>
      ) : null}
      <p className="buyer-product-checkout-note">
        Available for purchase in: <strong>{formatProductRegionNames(product.supportedRegions)}</strong>.
      </p>
      {share ? <ProductSharePanel share={share} source="backend" compact /> : null}
      <p className="buyer-product-checkout-note">Taxes and delivery options are confirmed during checkout.</p>
    </Card>
  )
}
