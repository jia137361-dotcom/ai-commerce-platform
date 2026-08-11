/**
 * Buyer DIY drafts are orderable without seller publish.
 * Catalog products still require published status.
 */

import { readString } from "./product-cart-bridge"

export function isBuyerDesignProduct(product: Record<string, unknown> | null | undefined): boolean {
  if (!product) return false
  const metadata =
    product.metadata && typeof product.metadata === "object"
      ? (product.metadata as Record<string, unknown>)
      : null
  if (metadata?.buyer_design === true || metadata?.design_source === "buyer_sdk") {
    return true
  }
  const tags = Array.isArray(product.tags) ? product.tags : []
  return tags.some((tag) => tag === "buyer-diy" || tag === "my-design" || tag === "custom-design")
}

export function isProductCartEligible(product: Record<string, unknown> | null | undefined): boolean {
  if (!product) return false
  const hasVariant = Boolean(readString(product.medusa_variant_id))
  if (!hasVariant) return false
  if (product.status === "published") return true
  return isBuyerDesignProduct(product)
}
