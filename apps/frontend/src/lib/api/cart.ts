import { apiFetch } from "./client"
import type { Cart, OrderSummary } from "./types"

export const createCart = (storeId: string) =>
  apiFetch<Cart>("/store/carts", {
    method: "POST",
    storeId,
    publishable: true,
    body: { currency_code: "usd" },
  })

export const getCart = (storeId: string, cartId: string) =>
  apiFetch<Cart>(`/store/carts/${encodeURIComponent(cartId)}`, {
    storeId,
    publishable: true,
  })

export const addLineItem = (storeId: string, cartId: string, variantId: string, quantity: number) =>
  apiFetch<Cart>(`/store/carts/${encodeURIComponent(cartId)}/line-items`, {
    method: "POST",
    storeId,
    publishable: true,
    body: { variant_id: variantId, quantity },
  })

export const completeCart = (storeId: string, cartId: string) =>
  apiFetch<OrderSummary>(`/store/carts/${encodeURIComponent(cartId)}/complete`, {
    method: "POST",
    storeId,
    publishable: true,
    body: { payment_provider_id: "pp_system_default" },
  })

export const updateLineItem = (storeId: string, cartId: string, lineId: string, quantity: number) =>
  apiFetch<{ cart_id: string; store_id: string; line_item: unknown; cart: Cart }>(
    `/store/carts/${encodeURIComponent(cartId)}/line-items/${encodeURIComponent(lineId)}`,
    {
      method: "PUT",
      storeId,
      publishable: true,
      body: { quantity },
    }
  )

export const removeLineItem = (storeId: string, cartId: string, lineId: string) =>
  apiFetch<{ cart_id: string; store_id: string; cart: Cart }>(
    `/store/carts/${encodeURIComponent(cartId)}/line-items/${encodeURIComponent(lineId)}`,
    {
      method: "DELETE",
      storeId,
      publishable: true,
    }
  )
