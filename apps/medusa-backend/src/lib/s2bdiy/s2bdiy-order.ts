import type { S2bdiyClient } from "./s2bdiy-client"

export type CreateOrderItem = {
  product_id: number | string
  size_id: number
  color_id: number
  num: number
}

export type S2bOrderAddress = {
  firstname: string
  lastname: string
  address: string
  city: string
  province: string
  postcode: string
  country: string
  mobile_phone: string
}

export type CreateOrderInput = {
  third_order_id: string
  platform: number
  logistics_id: number | string
  store_id: number | string
  items: CreateOrderItem[]
  address: S2bOrderAddress
  remark?: string
}

export async function listS2bStores(client: S2bdiyClient): Promise<Array<Record<string, unknown>>> {
  const data = await client.request<unknown>("/open/v1/store", { method: "GET", query: { page: 1, per_page: 20 } })
  if (data && typeof data === "object" && Array.isArray((data as Record<string, unknown>).data)) {
    return (data as Record<string, unknown>).data as Array<Record<string, unknown>>
  }
  return []
}

export function resolveS2bStoreId(stores: Array<Record<string, unknown>>): string | null {
  const fromEnv = process.env.S2BDIY_STORE_ID
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv
  }
  const first = stores[0]
  if (first?.id !== undefined && first.id !== null) {
    return String(first.id)
  }
  return null
}

export function buildDefaultS2bAddress(): S2bOrderAddress {
  return {
    firstname: process.env.S2BDIY_ORDER_FIRSTNAME ?? "Smoke",
    lastname: process.env.S2BDIY_ORDER_LASTNAME ?? "Test",
    address: process.env.S2BDIY_ORDER_ADDRESS ?? "123 Main St",
    city: process.env.S2BDIY_ORDER_CITY ?? "New York",
    province: process.env.S2BDIY_ORDER_PROVINCE ?? "NY",
    postcode: process.env.S2BDIY_ORDER_POSTCODE ?? "10001",
    country: process.env.S2BDIY_ORDER_COUNTRY ?? "US",
    mobile_phone: process.env.S2BDIY_ORDER_MOBILE_PHONE ?? "1234567890",
  }
}

export async function createOrder(
  client: S2bdiyClient,
  input: CreateOrderInput
): Promise<Record<string, unknown>> {
  return client.request<Record<string, unknown>>("/open/v1/order", {
    method: "POST",
    body: input,
  })
}

export async function payOrders(client: S2bdiyClient, orderIds: Array<number | string>): Promise<unknown> {
  return client.request("/open/v1/orderPay", {
    method: "POST",
    body: { ids: orderIds.map((id) => Number(id)) },
  })
}

export async function getOrderDetail(
  client: S2bdiyClient,
  orderId: number | string
): Promise<Record<string, unknown>> {
  return client.request<Record<string, unknown>>(`/open/v1/order/${orderId}`, { method: "GET" })
}

export function extractSupplierOrderId(response: Record<string, unknown>): string | null {
  const candidates = [
    response.id,
    response.order_id,
    response.order_no,
    (response.data as Record<string, unknown> | undefined)?.id,
  ]
  for (const c of candidates) {
    if (c !== undefined && c !== null && String(c).length > 0) {
      return String(c)
    }
  }
  return null
}

export function buildThirdOrderId(orderId: string, retryCount = 0): string {
  if (retryCount <= 0) return orderId
  return `${orderId}-retry-${retryCount}`
}
