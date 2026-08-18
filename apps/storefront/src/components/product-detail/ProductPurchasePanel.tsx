import { useEffect, useState } from "react"
import type { BuyerProductVariant, StoreProduct } from "../../lib/mock-data"
import { readBuyerDisplayPreferences } from "../../lib/buyer-display-preferences"
import type { ProductPurchaseState } from "../../pages/product/product-detail-state"
import type { BuyerShareInfo } from "../../lib/buyer-api"
import { ProductSharePanel } from "./ProductSharePanel"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import { MoneyText } from "../ui/MoneyText"
import { SelectField } from "../ui/SelectField"
import { StatusBadge } from "../ui/StatusBadge"
import { convertDisplayAmount, useBuyerDisplayPreferences } from "../../lib/buyer-display-preferences"

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

const uniqueOptionValues = (values: Array<string | null | undefined>) =>
  values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .filter((value, index, list) => list.indexOf(value) === index)

const optionValueLabel = (value: string | null | undefined, fallback: string) => value?.trim() || fallback
const isDefaultOptionValue = (value: string | null | undefined) => {
  const normalized = value?.trim().toLowerCase()
  return !normalized || normalized === "default" || normalized === "default option"
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
  const { displayCurrencyCode } = useBuyerDisplayPreferences()
  const reviewCount = product.reviewCount ?? 0
  const editorHref = designHref ?? (product.hasDesigner && product.id ? `/design/${encodeURIComponent(product.id)}` : undefined)
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) ?? variants[0]
  const [shippingQuote, setShippingQuote] = useState<{ amountUsd: number; logisticsName?: string | null; dayFrom?: number | null; dayTo?: number | null } | null>(null)
  useEffect(() => {
    if (!product.basicProductId || !selectedVariant) return
    let active = true
    void import("../../lib/buyer-api").then(({ fetchProductShippingQuote }) => fetchProductShippingQuote(product.id, { countryCode: readBuyerDisplayPreferences().countryCode, sizeId: selectedVariant.supplierSizeId ?? undefined, storeId: product.storeId }))
      .then((quote) => { if (active) setShippingQuote(quote) })
      .catch(() => { if (active) setShippingQuote(null) })
    return () => { active = false }
  }, [product.basicProductId, product.id, product.storeId, selectedVariant?.supplierSizeId, quantity])
  const purchasePrice = selectedVariant?.price ?? product.numericPrice
  const colorOptions = uniqueOptionValues(variants.map((variant) => variant.color))
  const sizeOptionsForSelectedColor = uniqueOptionValues(
    variants
      .filter((variant) => !colorOptions.length || variant.color === selectedVariant?.color)
      .map((variant) => variant.size)
  )
  const customOptionTypes = uniqueOptionValues(variants.map((variant) => variant.optionType))
  const customOptionLabel = customOptionTypes.length === 1 ? customOptionTypes[0] : "Option"
  const customOptionValues = uniqueOptionValues(variants.map((variant) => variant.optionValue))
  const hasCustomOptions = customOptionValues.length > 0
  const productTags = Array.from(
    new Set(
      (product.tags ?? [])
        .map((tag) => tag.trim().replace(/^#+/, ""))
        .filter(Boolean)
    )
  )
  const canSplitOptions = variants.length > 1 && (colorOptions.length > 1 || sizeOptionsForSelectedColor.length > 1)
  const changeSplitOption = (next: { color?: string; size?: string }) => {
    const currentColor = next.color ?? selectedVariant?.color ?? colorOptions[0]
    const currentSize = next.size ?? selectedVariant?.size
    const exact = variants.find((variant) => variant.color === currentColor && variant.size === currentSize)
    const sameColor = variants.find((variant) => variant.color === currentColor)
    const sameSize = variants.find((variant) => variant.size === currentSize)
    const match = exact ?? sameColor ?? sameSize ?? variants[0]
    if (match?.id) onVariantChange(match.id)
  }

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
      {productTags.length ? (
        <div className="buyer-product-tags" aria-label="Product tags">
          {productTags.map((tag) => <span key={tag}>#{tag}</span>)}
        </div>
      ) : null}
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

      <MoneyText
        amount={purchasePrice == null ? null : convertDisplayAmount(purchasePrice, "usd", displayCurrencyCode)}
        currencyCode={displayCurrencyCode}
        unavailableLabel="Price unavailable"
        className="buyer-product-price"
      />
      <div className="buyer-product-default-shipping">
        <span>Default shipping</span>
        {shippingQuote ? <strong>{convertDisplayAmount(shippingQuote.amountUsd, "usd", displayCurrencyCode).toFixed(2)} {displayCurrencyCode.toUpperCase()}</strong> : <strong>Calculated at checkout</strong>}
        {shippingQuote?.logisticsName ? <small>{shippingQuote.logisticsName}{shippingQuote.dayFrom != null ? ` · ${shippingQuote.dayFrom}-${shippingQuote.dayTo ?? shippingQuote.dayFrom} days` : ""}</small> : <small>Final amount depends on destination address and shipping method.</small>}
      </div>

      {hasCustomOptions ? (
        <SelectField label={customOptionLabel} value={selectedVariantId ?? ""} onChange={(event) => onVariantChange(event.target.value)}>
          {variants.map((variant) => (
            <option key={variant.id} value={variant.id} disabled={variant.isPurchasable === false}>
              {variant.optionValue || variant.title || "Default option"}
            </option>
          ))}
        </SelectField>
      ) : canSplitOptions ? (
        <div className="buyer-product-split-options">
          {colorOptions.length ? (
            <fieldset className="buyer-product-choice-group">
              <legend>Color</legend>
              <div className="buyer-product-choice-buttons">
                {colorOptions.map((color) => (
                  <button key={color} type="button" aria-label={`Color ${color}`} aria-pressed={selectedVariant?.color === color} onClick={() => changeSplitOption({ color })}>{color}</button>
                ))}
              </div>
            </fieldset>
          ) : null}
          {sizeOptionsForSelectedColor.length ? (
            <fieldset className="buyer-product-choice-group">
              <legend>Size</legend>
              <div className="buyer-product-choice-buttons">
                {sizeOptionsForSelectedColor.map((size) => {
                  const variantForSize = variants.find((variant) => (!selectedVariant?.color || variant.color === selectedVariant.color) && variant.size === size)
                  return <button key={size} type="button" aria-label={`Size ${size}`} aria-pressed={selectedVariant?.size === size} disabled={variantForSize?.isPurchasable === false} onClick={() => changeSplitOption({ size })}>{size}</button>
                })}
              </div>
            </fieldset>
          ) : null}
        </div>
      ) : variants.length > 1 ? (
        <SelectField label="Option" value={selectedVariantId ?? ""} onChange={(event) => onVariantChange(event.target.value)}>
          {variants.map((variant) => (
            <option key={variant.id} value={variant.id}>
              {variant.title || [optionValueLabel(variant.color, ""), optionValueLabel(variant.size, "")].filter(Boolean).join(" / ")}
            </option>
          ))}
        </SelectField>
      ) : variants.length === 1 && !isDefaultOptionValue(variants[0].title) ? (
        <div className="buyer-product-option-unavailable">
          <strong>Option</strong>
          <span>{variants[0].title || "Default option"}</span>
        </div>
      ) : variants.length === 1 ? (
        <div className="buyer-product-option-unavailable"><strong>Option</strong><span>Default option</span></div>
      ) : (
        <div className="buyer-product-option-unavailable">
          <strong>Option</strong>
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
      {share ? <ProductSharePanel share={share} source="backend" compact /> : null}
      <p className="buyer-product-checkout-note">Taxes and delivery options are confirmed during checkout.</p>
    </Card>
  )
}
