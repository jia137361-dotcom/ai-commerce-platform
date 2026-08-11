import type { BuyerOrderSummary } from "./buyer-api"

export const collectReservedCheckoutCartIds = (orders: BuyerOrderSummary[]) =>
  new Set(
    orders
      .filter((order) => order.orderKind === "checkout_reservation")
      .map((order) => order.checkoutCartId?.trim())
      .filter((cartId): cartId is string => Boolean(cartId))
  )

export const isReservedCheckoutCartId = (orders: BuyerOrderSummary[], cartId?: string | null) => {
  const normalized = cartId?.trim()
  return Boolean(normalized && collectReservedCheckoutCartIds(orders).has(normalized))
}
