import type { StoreCart } from "../../lib/mock-data"

type CartActionsDependencies = {
  updateLineItem: (cartId: string, lineId: string, quantity: number) => Promise<StoreCart>
  deleteLineItem: (cartId: string, lineId: string) => Promise<StoreCart>
}

export const updateCartItemQuantity = (
  cartId: string,
  lineId: string,
  quantity: number,
  dependencies: CartActionsDependencies
) => dependencies.updateLineItem(cartId, lineId, Math.max(1, Math.floor(quantity)))

export const removeCartItem = (
  cartId: string,
  lineId: string,
  dependencies: CartActionsDependencies
) => dependencies.deleteLineItem(cartId, lineId)
