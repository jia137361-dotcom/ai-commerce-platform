import type { CartLineItem, StoreCart } from "./mock-data"

export type BuyerCartItemView = {
  id: string
  title: string
  imageUrl?: string
  productHref: string
  variantLabel?: string
  quantity: number
  unitPrice?: number
  lineTotal?: number
  isAvailable: boolean
  unavailableReason?: string
}

export const normalizeBuyerCartItem = (item: CartLineItem): BuyerCartItemView => {
  const specs = [
    item.variantTitle,
    item.colorName ? `Color: ${item.colorName}` : undefined,
    item.sizeName ? `Size: ${item.sizeName}` : undefined,
    ...(item.selectedOptions ?? []).map((option) => `${option.name}: ${option.value}`),
  ].filter(Boolean)
  const isAvailable = Boolean(item.id && item.variantId && item.quantity > 0)
  const storeQuery = item.storeId ? `?store=${encodeURIComponent(item.storeId)}` : ""
  return {
    id: item.id,
    title: item.title || "Cart item",
    imageUrl: item.imageUrl || undefined,
    productHref: item.productId ? `/products/${encodeURIComponent(item.productId)}${storeQuery}` : "/",
    variantLabel: specs.length ? specs.join(" · ") : item.variantId ? "Default option" : undefined,
    quantity: Math.max(1, Math.floor(item.quantity || 1)),
    unitPrice: item.hasUnitPrice === false ? undefined : item.unitPrice,
    lineTotal: item.hasTotal === false ? undefined : item.total,
    isAvailable,
    unavailableReason: isAvailable ? undefined : "Variant information is unavailable.",
  }
}

export const canCheckoutCart = (cart: StoreCart | null) => Boolean(
  cart?.items.length &&
  cart.items.map(normalizeBuyerCartItem).every((item) => item.isAvailable && item.lineTotal != null) &&
  cart.hasTotal !== false
)
