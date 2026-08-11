import type { StoreCart } from "../../lib/mock-data"
import { registerStoreCart } from "../../lib/buyer-platform-cart"

type ProductCartActionInput = {
  storeId: string
  storeName?: string
  storeSlug?: string
  cartIdentity: string
  variantId: string
  quantity: number
  storageKey: string
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">
  createCart: () => Promise<StoreCart>
  addLineItem: (cartId: string, variantId: string, quantity: number) => Promise<StoreCart>
  isCartReservedForCheckout?: (cartId: string) => Promise<boolean>
}

export async function addProductSelectionToCart(input: ProductCartActionInput) {
  let cartId = input.storage.getItem(input.storageKey)
  if (cartId && await input.isCartReservedForCheckout?.(cartId)) {
    input.storage.removeItem(input.storageKey)
    cartId = null
  }

  if (!cartId) {
    const created = await input.createCart()
    cartId = created.id
    input.storage.setItem(input.storageKey, created.id)
  }

  try {
    const updated = await input.addLineItem(cartId, input.variantId, input.quantity)
    input.storage.setItem(input.storageKey, updated.id)
    registerStoreCart(input.storage, input.cartIdentity, input.storeId, updated.id, {
      storeName: input.storeName,
      storeSlug: input.storeSlug,
    })
    return updated
  } catch (error) {
    console.warn("[buyer-api] add to cart failed, creating a fresh store-scoped cart", {
      message: error instanceof Error ? error.message : String(error),
      storageKey: input.storageKey,
      storeId: input.storeId,
    })
    const created = await input.createCart()
    input.storage.setItem(input.storageKey, created.id)
    const updated = await input.addLineItem(created.id, input.variantId, input.quantity)
    input.storage.setItem(input.storageKey, updated.id)
    registerStoreCart(input.storage, input.cartIdentity, input.storeId, updated.id, {
      storeName: input.storeName,
      storeSlug: input.storeSlug,
    })
    return updated
  }
}
