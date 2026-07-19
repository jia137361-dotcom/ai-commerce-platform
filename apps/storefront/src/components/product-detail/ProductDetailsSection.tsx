import type { StoreProduct } from "../../lib/mock-data"
import { Card } from "../ui/Card"
import { formatProductRegionCountries, formatProductRegionNames } from "../../pages/product/product-regions"

export function ProductDetailsSection({ product }: { product: StoreProduct }) {
  const regionNames = formatProductRegionNames(product.supportedRegions)
  const regionCountries = formatProductRegionCountries(product.supportedRegions)
  return (
    <section className="buyer-product-details-section">
      <div><p>Product information</p><h2>Details</h2><p>{product.description || "No product description is available."}</p></div>
      <Card as="dl">
        {product.shipFromLabel ? <div><dt>Ships from</dt><dd>{product.shipFromLabel}</dd></div> : null}
        <div><dt>Category</dt><dd>{product.category || "Not provided"}</dd></div>
        <div><dt>Available regions</dt><dd>{regionNames}</dd></div>
        <div><dt>Supported countries</dt><dd>{regionCountries}</dd></div>
        <div><dt>Delivery type</dt><dd>{product.requiresShipping == null ? "Not provided" : product.requiresShipping ? "Physical delivery" : "No shipping required"}</dd></div>
        <div><dt>Options</dt><dd>{product.variants?.length ? `${product.variants.length} available` : "Not provided"}</dd></div>
        <div><dt>Tags</dt><dd>{product.tags?.length ? product.tags.join(", ") : "Not provided"}</dd></div>
      </Card>
    </section>
  )
}
