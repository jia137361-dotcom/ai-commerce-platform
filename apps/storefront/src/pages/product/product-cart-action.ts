import type { StoreCart } from "../../lib/mock-data"

type ProductCartActionInput = {
  variantId: string
  quantity: number
  storageKey: string
  storage: Pick<Storage, "getItem" | "setItem">
  createCart: () => Promise<StoreCart>
  addLineItem: (cartId: string, variantId: string, quantity: number) => Promise<StoreCart>
}

export async function addProductSelectionToCart(input: ProductCartActionInput) {
  let cartId = input.storage.getItem(input.storageKey)
  if (!cartId) {
    const created = await input.createCart()
    cartId = created.id
    input.storage.setItem(input.storageKey, created.id)
  }

  try {
    const updated = await input.addLineItem(cartId, input.variantId, input.quantity)
    input.storage.setItem(input.storageKey, updated.id)
    return updated
  } catch (error) {
    console.warn("[buyer-api] add to cart failed, creating a fresh store-scoped cart", {
      message: error instanceof Error ? error.message : String(error),
      storageKey: input.storageKey,
    })
    const created = await input.createCart()
    input.storage.setItem(input.storageKey, created.id)
    const updated = await input.addLineItem(created.id, input.variantId, input.quantity)
    input.storage.setItem(input.storageKey, updated.id)
    return updated
  }
}
