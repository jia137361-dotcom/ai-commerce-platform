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

export function isSupplierCatalogBlankProduct(product: Record<string, unknown>) {
  const metadata =
    product.metadata && typeof product.metadata === "object"
      ? (product.metadata as Record<string, unknown>)
      : {}
  if (metadata.catalog_blank === true) return true
  const tags = Array.isArray(product.tags) ? product.tags : []
  return tags.some((tag) => tag === "blank" || tag === "s2bdiy-blank")
}

/**
 * Storefront catalog/details only expose seller-published catalog products.
 * Buyer Custom Designs and supplier blanks are private workflow resources.
 */
export function isStorefrontProductVisible(product: Record<string, unknown>) {
  const status = typeof product.status === "string" ? product.status : ""
  if (status !== "published") return false
  if (isBuyerCustomDesignProduct(product)) return false
  if (isSupplierCatalogBlankProduct(product)) return false
  return true
}
