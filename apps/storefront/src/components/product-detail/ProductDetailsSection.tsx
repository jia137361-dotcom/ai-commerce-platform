import type { StoreProduct } from "../../lib/mock-data"
import { Card } from "../ui/Card"

export function ProductDetailsSection({ product }: { product: StoreProduct }) {
  return (
    <section className="buyer-product-details-section">
      <div><p>Product information</p><h2>Details</h2><p>{product.description || "No product description is available."}</p></div>
      <Card as="dl">
        <div><dt>Category</dt><dd>{product.category || "Not provided"}</dd></div>
        <div><dt>Delivery type</dt><dd>{product.requiresShipping == null ? "Not provided" : product.requiresShipping ? "Physical delivery" : "No shipping required"}</dd></div>
        <div><dt>Options</dt><dd>{product.variants?.length ? `${product.variants.length} available` : "Not provided"}</dd></div>
        <div><dt>Tags</dt><dd>{product.tags?.length ? product.tags.join(", ") : "Not provided"}</dd></div>
      </Card>
    </section>
  )
}
