import type { StoreProduct } from "../../lib/mock-data"
import { DisplayMoneyText } from "../ui/DisplayMoneyText"

type ProductGridProps = {
  products: StoreProduct[]
  source?: "backend" | "mock"
  error?: string
  onAddToCart?: (product: StoreProduct) => void
}

export function ProductGrid({ products, source, error, onAddToCart }: ProductGridProps) {
  return (
    <section className="products-section" id="products">
      <div className="section-head">
        <div>
          <h2>Featured Products</h2>
          {source && <p>{source === "backend" ? "Loaded from Medusa Store API" : "Showing fallback storefront products"}</p>}
        </div>
        <select aria-label="Sort products">
          <option>Sort by recommended</option>
          <option>Price low to high</option>
          <option>Newest arrivals</option>
        </select>
      </div>
      {error && <div className="soft-notice">Backend fallback: {error}</div>}
      <div className="product-grid">
        {products.map((product) => (
          <article className="product-card" key={product.id}>
            <a className="product-image-wrap" href={`/products/${encodeURIComponent(product.id)}`}>
              <img src={product.imageUrl} alt={product.title} />
              {product.badge && <span className="badge">{product.badge}</span>}
            </a>
            <div className="product-body">
              <span>{product.category}</span>
              <h3><a href={`/products/${encodeURIComponent(product.id)}`}>{product.title}</a></h3>
              <p>{product.description}</p>
              <div className="product-card-meta">
                <strong><DisplayMoneyText amount={product.numericPrice} unavailableLabel="Price unavailable" /></strong>
                <small>{product.averageRating ? `${product.averageRating.toFixed(1)} (${product.reviewCount ?? 0})` : "New"}</small>
              </div>
              <div className="product-card-actions">
                <a className="secondary-button" href={`/products/${encodeURIComponent(product.id)}`}>Quick View</a>
                {onAddToCart && (
                  <button type="button" disabled={!product.isCartAddable} onClick={() => onAddToCart(product)}>
                    {product.isCartAddable ? "Add to Cart" : "Unavailable"}
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
