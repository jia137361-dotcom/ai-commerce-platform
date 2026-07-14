/** Whether a store-core product may be opened on the buyer storefront by id. */

export function isBuyerCustomDesignProduct(product: Record<string, unknown>) {
  const metadata =
    product.metadata && typeof product.metadata === "object"
      ? (product.metadata as Record<string, unknown>)
      : {}
  if (metadata.buyer_design === true || metadata.design_source === "buyer_sdk") {
    return true
  }
  const tags = Array.isArray(product.tags) ? product.tags : []
  return tags.some(
    (tag) => tag === "buyer-diy" || tag === "my-design" || tag === "custom-design"
  )
}

/**
 * Catalog-listed products must be published.
 * Buyer Custom Designs remain viewable (review/share) even as draft until checkout publishes them.
 */
export function isStorefrontProductVisible(product: Record<string, unknown>) {
  const status = typeof product.status === "string" ? product.status : ""
  if (status === "archived") return false
  if (status === "published") return true
  return isBuyerCustomDesignProduct(product)
}
