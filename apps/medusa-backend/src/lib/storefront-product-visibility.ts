/** Storefront visibility for catalog blanks vs buyer-owned custom designs. */

import {
  buyerOwnsResource,
  readBuyerResourceOwner,
} from "./buyer-resource-ownership"

export type StorefrontViewer = {
  customerId?: string | null
  guestKey?: string | null
}

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
 * Store homepage / public catalog.
 * Shows published blanks and ordinary published products.
 * Buyer custom designs never appear here — they live under My Designs.
 */
export function isStorefrontCatalogVisible(product: Record<string, unknown>) {
  const status = typeof product.status === "string" ? product.status : ""
  if (status !== "published") return false
  if (isBuyerCustomDesignProduct(product)) return false
  return true
}

/**
 * Product detail / direct id access.
 * Blanks and ordinary products: published only.
 * Custom designs: owner only (any status); never visible to other buyers.
 */
export function isStorefrontProductVisible(
  product: Record<string, unknown>,
  viewer?: StorefrontViewer
) {
  if (isBuyerCustomDesignProduct(product)) {
    const metadata =
      product.metadata && typeof product.metadata === "object"
        ? (product.metadata as Record<string, unknown>)
        : {}
    return buyerOwnsResource(
      readBuyerResourceOwner(metadata),
      viewer?.customerId ?? null,
      viewer?.guestKey ?? null
    )
  }

  const status = typeof product.status === "string" ? product.status : ""
  return status === "published"
}
