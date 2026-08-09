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
        {product.supplierDetails?.englishMaterial ? <div><dt>Material</dt><dd>{product.supplierDetails.englishMaterial}</dd></div> : null}
        {product.supplierDetails?.englishTechnology ? <div><dt>Technology</dt><dd>{product.supplierDetails.englishTechnology}</dd></div> : null}
        {product.supplierDetails?.produceCountry ? <div><dt>Production country</dt><dd>{product.supplierDetails.produceCountry}</dd></div> : null}
        {product.supplierDetails?.warehouse ? <div><dt>Warehouse</dt><dd>{product.supplierDetails.warehouse}</dd></div> : null}
        {product.supplierDetails?.deliveryNote ? <div><dt>Delivery</dt><dd>{product.supplierDetails.deliveryNote}</dd></div> : null}
        {product.supplierDetails?.colors.length ? <div><dt>Colors</dt><dd>{product.supplierDetails.colors.map((item) => item.name).join(", ")}</dd></div> : null}
        {product.supplierDetails?.sizes.length ? <div><dt>Sizes</dt><dd>{product.supplierDetails.sizes.map((item) => item.name).join(", ")}</dd></div> : null}
        {product.supplierDetails?.views.length ? <div><dt>Print views</dt><dd>{product.supplierDetails.views.map((item) => item.name).join(", ")}</dd></div> : null}
        {product.supplierDetails?.printSpecs.length ? <div><dt>Print areas</dt><dd>{product.supplierDetails.printSpecs.map((item) => `${String(item.print_file_width ?? item.design_area_width ?? "?")} × ${String(item.print_file_height ?? item.design_area_height ?? "?")} px`).join(", ")}</dd></div> : null}
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
