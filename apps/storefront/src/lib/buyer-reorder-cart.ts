import { addCartLineItem, createCart, fetchCart, setActiveBuyerStoreId, type ReorderLineInput } from "./buyer-api"
import { resolveBuyerCartStorageId } from "./buyer-cart-storage"
import { registerStoreCart } from "./buyer-platform-cart"
import type { StoreCart } from "./mock-data"

type CartStorage = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">

type ReaddCartDeps = {
  storage?: CartStorage
  createCart?: (input: { storeId: string; countryCode: string }) => Promise<StoreCart>
  fetchCart?: (cartId: string, input: { storeId: string }) => Promise<StoreCart>
  addLineItem?: (
    cartId: string,
    variantId: string,
    quantity: number,
    input: { storeId: string }
  ) => Promise<StoreCart>
  registerCart?: typeof registerStoreCart
  setActiveStoreId?: (storeId: string) => void
}

export type ReaddItemsToCartInput = {
  storeId: string
  storeName?: string
  storeSlug?: string
  countryCode?: string
  customerId?: string | null
  items: ReorderLineInput[]
  reservedCartIds?: Array<string | null | undefined>
  isCartReservedForCheckout?: (cartId: string) => Promise<boolean> | boolean
} & ReaddCartDeps

const normalizeReservedCartIds = (cartIds?: Array<string | null | undefined>) =>
  new Set((cartIds ?? []).map((cartId) => cartId?.trim()).filter((cartId): cartId is string => Boolean(cartId)))

const readBrowserStorage = () => {
  if (typeof window === "undefined") {
    throw new Error("Cart storage is unavailable.")
  }
  return window.localStorage
}

const shouldCreateFreshCart = (cart?: StoreCart | null) => Boolean(!cart || cart.completedAt)

/**
 * Re-add expired checkout reservation items into the buyer's normal cart.
 * Unlike reorder-to-checkout, this preserves any non-checkout items already in cart.
 */
export const readdItemsToCart = async (input: ReaddItemsToCartInput) => {
  const lines = input.items.filter((item) => item.variantId && item.quantity > 0)
  if (!lines.length) {
    throw new Error("This order has no purchasable variants to add to cart.")
  }

  const storage = input.storage ?? readBrowserStorage()
  const createNextCart = input.createCart ?? ((cartInput) => createCart(cartInput))
  const fetchNextCart = input.fetchCart ?? ((cartId, cartInput) => fetchCart(cartId, cartInput))
  const addNextLineItem = input.addLineItem ?? ((cartId, variantId, quantity, cartInput) =>
    addCartLineItem(cartId, variantId, quantity, cartInput))
  const registerNextCart = input.registerCart ?? registerStoreCart
  const setActiveStore = input.setActiveStoreId ?? setActiveBuyerStoreId
  const countryCode = input.countryCode ?? "us"
  const reservedCartIds = normalizeReservedCartIds(input.reservedCartIds)

  setActiveStore(input.storeId)

  const resolved = resolveBuyerCartStorageId(input.storeId, input.customerId, storage)
  let cartId = resolved.cartId
  let reusedExistingCart = false

  if (cartId) {
    const isReserved =
      reservedCartIds.has(cartId) || Boolean(await input.isCartReservedForCheckout?.(cartId))
    if (isReserved) {
      storage.removeItem(resolved.storageKey)
      cartId = null
    }
  }

  let cart: StoreCart | null = null
  if (cartId) {
    try {
      cart = await fetchNextCart(cartId, { storeId: input.storeId })
      reusedExistingCart = !shouldCreateFreshCart(cart)
    } catch {
      cart = null
    }
  }

  let initialCart: StoreCart
  if (cart && !cart.completedAt) {
    initialCart = cart
  } else {
    initialCart = await createNextCart({ storeId: input.storeId, countryCode })
    reusedExistingCart = false
  }

  let nextCart = initialCart
  for (const line of lines) {
    nextCart = await addNextLineItem(nextCart.id, line.variantId, line.quantity, {
      storeId: input.storeId,
    })
  }

  registerNextCart(storage, resolved.identity, input.storeId, nextCart.id, {
    storeName: input.storeName,
    storeSlug: input.storeSlug,
  })

  return {
    cart: nextCart,
    cartHref: "/cart",
    reusedExistingCart,
  }
}
