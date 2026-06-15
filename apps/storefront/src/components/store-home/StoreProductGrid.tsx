import type { StoreProduct } from "../../lib/mock-data"
import { StoreProductCard } from "./StoreProductCard"

type StoreProductGridProps = {
  products: StoreProduct[]
}

export function StoreProductGrid({ products }: StoreProductGridProps) {
  return (
    <section className="buyer-product-section" id="products">
      <div className="buyer-product-grid">
        {products.map((product) => (
          <div className="buyer-product-card-shell" key={product.id}>
            <StoreProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  )
}
