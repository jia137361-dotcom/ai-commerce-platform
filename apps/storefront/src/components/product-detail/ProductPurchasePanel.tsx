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
  share?: BuyerShareInfo | null
}

export function ProductPurchasePanel({ product, variants, selectedVariantId, onVariantChange, purchaseState, quantity, setQuantity, adding, authLoading = false, requiresSignIn = false, addNotice, onAddToCart, share }: ProductPurchasePanelProps) {
  const reviewCount = product.reviewCount ?? 0
  return (
    <Card as="aside" className="buyer-product-purchase">
      <div className="buyer-product-purchase-heading">
        <p>{product.category || "Uncategorized"}</p>
        <StatusBadge tone={purchaseState.availabilityTone}>{purchaseState.availabilityLabel}</StatusBadge>
      </div>
      <h1>{product.title}</h1>
      <div className="buyer-product-score">
        {product.averageRating != null ? <><span aria-hidden="true">★</span><strong>{product.averageRating.toFixed(1)}</strong><a href="#reviews">{reviewCount} reviews</a></> : <a href="#reviews">No reviews yet</a>}
      </div>

      <MoneyText amount={product.numericPrice} currencyCode="USD" unavailableLabel="Price unavailable" className="buyer-product-price" />

      {variants.length > 1 ? (
        <SelectField label="Option" value={selectedVariantId ?? ""} onChange={(event) => onVariantChange(event.target.value)}>
          {variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.title}</option>)}
        </SelectField>
      ) : variants.length === 1 ? (
        <div className="buyer-product-option-unavailable"><strong>Option</strong><span>{variants[0].title || "Default option"}</span></div>
      ) : (
        <div className="buyer-product-option-unavailable"><strong>Options unavailable</strong><span>No purchasable variant was returned.</span></div>
      )}

      <div className="buyer-product-quantity">
        <span>Quantity</span>
        <div>
          <Button variant="ghost" ariaLabel="Decrease quantity" disabled={quantity <= 1 || adding} onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</Button>
          <strong aria-live="polite">{quantity}</strong>
          <Button variant="ghost" ariaLabel="Increase quantity" disabled={quantity >= 99 || adding} onClick={() => setQuantity(Math.min(99, quantity + 1))}>+</Button>
        </div>
      </div>

      {!purchaseState.canAdd && purchaseState.reason ? <p className="buyer-product-disabled-reason">{purchaseState.reason}</p> : null}
      {addNotice ? <p className={`buyer-product-add-notice ${addNotice.tone}`} role={addNotice.tone === "error" ? "alert" : "status"}>{addNotice.message}{addNotice.tone === "success" ? <a href="/cart">View cart</a> : null}</p> : null}

      <Button className="buyer-product-add-button" loading={adding || authLoading} disabled={!purchaseState.canAdd || adding || authLoading} onClick={onAddToCart}>
        {authLoading ? "Checking account..." : adding ? "Adding..." : requiresSignIn ? "Sign in to add to cart" : "Add to cart"}
      </Button>
      {product.hasDesigner && product.id ? (
        <a href={`/design/${encodeURIComponent(product.id)}`} className="designer-entry-button">
          Customize This Product
        </a>
      ) : null}
      {requiresSignIn ? <p className="buyer-product-checkout-note">Browsing is open to everyone. Sign in before adding this option to your cart.</p> : null}
      <p className="buyer-product-checkout-note">
        Available for purchase in: <strong>{formatProductRegionNames(product.supportedRegions)}</strong>.
      </p>
      {share ? <ProductSharePanel share={share} source="backend" compact /> : null}
      <p className="buyer-product-checkout-note">Taxes and delivery options are confirmed during checkout.</p>
    </Card>
  )
}
