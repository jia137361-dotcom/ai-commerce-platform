import type { StoreProduct } from "../../lib/mock-data"
import { buildProductDetailHref } from "../../lib/storefront-links"
import { getShipFromFlagUrl } from "../../lib/ship-from-flag"
import { Card } from "../ui/Card"
import { MoneyText } from "../ui/MoneyText"
import { StatusBadge } from "../ui/StatusBadge"
import { convertDisplayAmount, useBuyerDisplayPreferences } from "../../lib/buyer-display-preferences"

type ProductCardProps = {
  product: StoreProduct
}

export function ProductCard({ product }: ProductCardProps) {
  const { displayCurrencyCode } = useBuyerDisplayPreferences()
  const href = buildProductDetailHref(product)
  const available = Boolean(product.isCartAddable && product.medusaVariantId)
  const rating = product.averageRating ? product.averageRating.toFixed(1) : null
  const flagUrl = getShipFromFlagUrl(product.shipFromCountry)
  const shipFromLabel = product.shipFromLabel?.trim() || null

  return (
    <Card as="article" className="buyer-shop-product-card">
      <a className="buyer-shop-product-media" href={href} aria-label={`View ${product.title}`}>
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.title} loading="lazy" />
        ) : (
          <span className="buyer-shop-product-image-placeholder" role="img" aria-label="Product image unavailable">
            Image unavailable
          </span>
        )}
        {flagUrl ? (
          <img
            className="buyer-shop-product-ship-flag"
            src={flagUrl}
            alt={shipFromLabel ? `Ships from ${shipFromLabel}` : "Ship-from country"}
            loading="lazy"
            decoding="async"
          />
        ) : null}
        {product.badge ? (
          <StatusBadge tone="success">{product.badge}</StatusBadge>
        ) : null}
        {!available ? <StatusBadge tone="neutral">Unavailable</StatusBadge> : null}
      </a>
      <div className="buyer-shop-product-body">
        <p>{(product.storeName ?? product.category) || "Uncategorized"}</p>
        <h3><a href={href}>{product.title}</a></h3>
        <div className="buyer-shop-product-meta">
          <span aria-label={rating ? `Rated ${rating} out of 5` : "No ratings yet"}>
            {rating ? `★ ${rating}` : "New"}
          </span>
          {rating ? <small>{product.reviewCount ?? 0} reviews</small> : null}
        </div>
        {shipFromLabel ? (
          <span className="buyer-shop-product-ship-from">
            Ships from {shipFromLabel}
          </span>
        ) : null}
        <MoneyText
          amount={product.numericPrice == null ? null : convertDisplayAmount(product.numericPrice, "usd", displayCurrencyCode)}
          currencyCode={displayCurrencyCode}
          unavailableLabel="Price unavailable"
        />
      </div>
    </Card>
  )
}
