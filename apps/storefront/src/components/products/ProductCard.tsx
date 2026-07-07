import type { StoreProduct } from "../../lib/mock-data"
import { Card } from "../ui/Card"
import { DisplayMoneyText } from "../ui/DisplayMoneyText"
import { StatusBadge } from "../ui/StatusBadge"

type ProductCardProps = {
  product: StoreProduct
}

export function ProductCard({ product }: ProductCardProps) {
  const storeQuery = product.storeId ? `?store=${encodeURIComponent(product.storeId)}` : ""
  const href = `/products/${encodeURIComponent(product.id)}${storeQuery}`
  const available = Boolean(product.isCartAddable && product.medusaVariantId)
  const rating = product.averageRating ? product.averageRating.toFixed(1) : null

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
        {product.badge ? <StatusBadge tone="success">{product.badge}</StatusBadge> : null}
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
        <DisplayMoneyText amount={product.numericPrice} unavailableLabel="Price unavailable" />
      </div>
    </Card>
  )
}
