export type BuyerSession = {
  email: string
  storeId: string
}

export type SellerSession = {
  email: string
  token: string
}

const buyerKey = "citigoo.buyer"
const sellerKey = "citigoo.seller"
const cartKey = "citigoo.cart"
const orderKey = "citigoo.orders"

const readJson = <T>(key: string): T | null => {
  try {
    const value = window.localStorage.getItem(key)
    return value ? (JSON.parse(value) as T) : null
  } catch {
    return null
  }
}

export const session = {
  getBuyer: () => readJson<BuyerSession>(buyerKey),
  setBuyer: (value: BuyerSession) => window.localStorage.setItem(buyerKey, JSON.stringify(value)),
  clearBuyer: () => window.localStorage.removeItem(buyerKey),
  getSeller: () => readJson<SellerSession>(sellerKey),
  setSeller: (value: SellerSession) => window.localStorage.setItem(sellerKey, JSON.stringify(value)),
  clearSeller: () => window.localStorage.removeItem(sellerKey),
  getCartId: (storeId: string) => window.localStorage.getItem(`${cartKey}.${storeId}`),
  setCartId: (storeId: string, cartId: string) => window.localStorage.setItem(`${cartKey}.${storeId}`, cartId),
  clearCartId: (storeId: string) => window.localStorage.removeItem(`${cartKey}.${storeId}`),
  saveOrder: (order: { order_id: string; display_id?: number; email?: string; store_id: string; payment_status?: string | null; fulfillment_status?: string | null; created_at?: string }) => {
    const existing = readJson<typeof order[]>(orderKey) ?? []
    window.localStorage.setItem(orderKey, JSON.stringify([order, ...existing.filter((o) => o.order_id !== order.order_id)].slice(0, 8)))
  },
  getOrders: () =>
    readJson<Array<{ order_id: string; display_id?: number; email?: string; store_id: string; payment_status?: string | null; fulfillment_status?: string | null; created_at?: string }>>(orderKey) ?? [],
}
