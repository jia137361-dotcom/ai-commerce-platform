import { apiFetch } from "./client"
import type { OrderSummary } from "./types"

export const lookupOrder = (storeId: string, email: string, displayId: string) =>
  apiFetch<OrderSummary>(
    `/store/orders/lookup?email=${encodeURIComponent(email)}&display_id=${encodeURIComponent(displayId)}`,
    { storeId, publishable: true }
  )

export const getOrderTracking = (storeId: string, orderId: string, email: string) =>
  apiFetch<OrderSummary & { fulfillment_order?: unknown; shipments?: unknown[] }>(
    `/store/orders/${encodeURIComponent(orderId)}/tracking?email=${encodeURIComponent(email)}`,
    { storeId, publishable: true }
  )

export const listAdminOrders = (storeId: string, token: string) =>
  apiFetch<{ store_id: string; count: number; orders: OrderSummary[] }>("/admin/orders?limit=100", {
    storeId,
    adminToken: token,
  })

export const pushFulfillment = (storeId: string, token: string, orderId: string) =>
  apiFetch<Record<string, unknown>>(`/admin/orders/${encodeURIComponent(orderId)}/push-fulfillment`, {
    method: "POST",
    storeId,
    adminToken: token,
    body: {},
  })

export const mockShipment = (storeId: string, token: string, orderId: string) =>
  apiFetch<Record<string, unknown>>(`/admin/orders/${encodeURIComponent(orderId)}/mock-shipment`, {
    method: "POST",
    storeId,
    adminToken: token,
    body: {},
  })

export const getSupplierOrder = (storeId: string, token: string, orderId: string) =>
  apiFetch<Record<string, unknown>>(`/admin/orders/${encodeURIComponent(orderId)}/supplier-order`, {
    storeId,
    adminToken: token,
  })

export const retrySupplierPay = (storeId: string, token: string, orderId: string) =>
  apiFetch<Record<string, unknown>>(`/admin/orders/${encodeURIComponent(orderId)}/retry-supplier-pay`, {
    method: "POST",
    storeId,
    adminToken: token,
    body: {},
  })

export const syncSupplierOrders = (storeId: string, token: string) =>
  apiFetch<Record<string, unknown>>("/admin/supplier-orders/sync", {
    method: "POST",
    storeId,
    adminToken: token,
    body: {},
  })
