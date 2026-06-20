import type { BuyerProductVariant, StoreProduct } from "../../lib/mock-data"

export type ProductPurchaseState = {
  canAdd: boolean
  reason?: string
  availabilityLabel: string
  availabilityTone: "success" | "warning" | "neutral"
}

export const resolveSelectedProductVariant = (product: StoreProduct, selectedVariantId?: string) =>
  product.variants?.find((variant) => variant.id === selectedVariantId) ??
  product.variants?.[0] ??
  (product.medusaVariantId ? {
    id: product.medusaVariantId,
    title: "Default option",
    isPurchasable: Boolean(product.isCartAddable),
  } satisfies BuyerProductVariant : undefined)

export const resolveProductPurchaseState = (
  product: StoreProduct,
  selectedVariant?: BuyerProductVariant
): ProductPurchaseState => {
  if (!selectedVariant?.id) {
    return { canAdd: false, reason: "No purchasable variant is available.", availabilityLabel: "Unavailable", availabilityTone: "neutral" }
  }
  if (!product.isCartAddable || !selectedVariant.isPurchasable) {
    return { canAdd: false, reason: "This product is not available for cart purchase.", availabilityLabel: "Unavailable", availabilityTone: "neutral" }
  }
  if (selectedVariant.manageInventory && selectedVariant.inventoryQuantity === 0 && !selectedVariant.allowBackorder) {
    return { canAdd: false, reason: "This option is out of stock.", availabilityLabel: "Out of stock", availabilityTone: "warning" }
  }
  if (typeof selectedVariant.inventoryQuantity === "number") {
    return { canAdd: true, availabilityLabel: `${selectedVariant.inventoryQuantity} available`, availabilityTone: "success" }
  }
  return { canAdd: true, availabilityLabel: "Availability confirmed at checkout", availabilityTone: "neutral" }
}
