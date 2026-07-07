import type { StoreProduct } from "../../lib/mock-data"
import { DisplayMoneyText } from "../ui/DisplayMoneyText"

type StoreProductCardProps = {
  product: StoreProduct
}

export function StoreProductCard({ product }: StoreProductCardProps) {
  const canAdd = Boolean(product.isCartAddable && product.medusaVariantId)
  const rating = product.averageRating ? product.averageRating.toFixed(1) : null

  return (
    <article className="buyer-product-card">
      <a className="buyer-product-image" href={`/products/${encodeURIComponent(product.id)}`}>
        <img src={product.imageUrl} alt={product.title} />
        {product.badge && <span className="buyer-product-badge">{product.badge}</span>}
        {!canAdd && <span className="buyer-product-unavailable">Unavailable</span>}
      </a>
      <div className="buyer-product-copy">
        <small>{product.category || "NESPRESSO"}</small>
        <h2>
          <a href={`/products/${encodeURIComponent(product.id)}`}>{product.title}</a>
        </h2>
        <div className="buyer-product-rating">
          <span aria-hidden="true">★★★★★</span>
          <em>{rating ? `${rating} · ${product.reviewCount ?? 0}` : "New"}</em>
        </div>
        <strong><DisplayMoneyText amount={product.numericPrice} unavailableLabel="Price unavailable" /></strong>
      </div>
    </article>
  )
}
