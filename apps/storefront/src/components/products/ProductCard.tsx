import type { StoreProduct } from "../../lib/mock-data"
import { buildAiDesignHref, buildStudioEditorHref } from "../../lib/buyer-design-handoff"
import { useBuyerLocale } from "../../lib/locale"
import { Card } from "../ui/Card"
import { MoneyText } from "../ui/MoneyText"
import { StatusBadge } from "../ui/StatusBadge"

type ProductCardProps = {
  product: StoreProduct
}

export function ProductCard({ product }: ProductCardProps) {
  const { t } = useBuyerLocale()
  const href = product.storeId
    ? `/products/${encodeURIComponent(product.id)}?store=${encodeURIComponent(product.storeId)}`
    : `/products/${encodeURIComponent(product.id)}`
  const customizeHref = product.hasDesigner
    ? (product.storeId
        ? `${buildStudioEditorHref(product.id)}?store=${encodeURIComponent(product.storeId)}`
        : buildStudioEditorHref(product.id))
    : null
  const available = Boolean(product.isCartAddable && product.medusaVariantId)
  const rating = product.averageRating ? product.averageRating.toFixed(1) : null

  return (
    <Card as="article" className="buyer-shop-product-card">
      <a className="buyer-shop-product-media" href={customizeHref || href} aria-label={`Customize ${product.title}`}>
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.title} loading="lazy" />
        ) : (
          <span className="buyer-shop-product-image-placeholder" role="img" aria-label="Product image unavailable">
            Image unavailable
          </span>
        )}
        {product.hasDesigner ? (
          <StatusBadge tone="success" className="buyer-shop-product-diy-badge">
            {t("customizeBadge")}
          </StatusBadge>
        ) : product.badge ? (
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
        <MoneyText amount={product.numericPrice} currencyCode="USD" unavailableLabel="Price unavailable" />
        {customizeHref ? (
          <a className="buyer-shop-product-customize" href={customizeHref}>
            {t("customizeLink")}
          </a>
        ) : null}
        {product.hasDesigner ? (
          <a
            className="buyer-shop-product-customize"
            href={buildAiDesignHref({
              productId: product.id,
              returnTo: customizeHref || undefined,
            })}
          >
            {t("navAiDesign")}
          </a>
        ) : null}
      </div>
    </Card>
  )
}
