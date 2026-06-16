import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { resolveCurrentStore } from "../../../../../lib/store-context"
import { readOrderStoreId } from "../../../../../lib/order-store-context"
import {
  ORDER_META_PAYMENT_STATUS,
  readOrderFulfillmentStatusMeta,
} from "../../../../../lib/order-custom-metadata"

type OrderLineItem = {
  title?: string | null
  thumbnail?: string | null
  quantity?: number | string | null
}

type CustomerOrder = {
  id?: string
  display_id?: string | number | null
  customer_id?: string | null
  email?: string | null
  status?: string | null
  created_at?: string | Date | null
  currency_code?: string | null
  total?: number | string | null
  metadata?: Record<string, unknown> | null
  items?: OrderLineItem[] | null
}

type AuthenticatedRequest = MedusaRequest & {
  auth_context?: {
    actor_id?: string
  }
}

const readHeader = (req: MedusaRequest, name: string) => {
  const value = req.headers[name.toLowerCase()]
  return Array.isArray(value) ? value[0] : value
}

const validateHeaders = (req: MedusaRequest) => {
  if (!readHeader(req, "x-publishable-api-key")) {
    return "x-publishable-api-key is required"
  }

  if (!readHeader(req, "x-store-id")) {
    return "X-Store-Id is required"
  }

  return null
}

const readPositiveInt = (value: unknown, fallback: number, max?: number) => {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = typeof raw === "string" ? Number(raw) : typeof raw === "number" ? raw : NaN
  if (!Number.isFinite(parsed) || parsed < 0) return fallback
  const rounded = Math.floor(parsed)
  return typeof max === "number" ? Math.min(rounded, max) : rounded
}

const readStringFilter = (value: unknown) => {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined
}

const readAuthCustomerId = (req: MedusaRequest) =>
  (req as AuthenticatedRequest).auth_context?.actor_id

const readNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const dateValue = (value: unknown) => {
  if (typeof value === "string") return value
  if (value instanceof Date) return value.toISOString()
  return null
}

const normalizeOrderSummary = (order: CustomerOrder) => {
  const metadata = order.metadata ?? null
  const items = order.items ?? []
  return {
    order_id: order.id ?? "",
    display_id: order.display_id ?? null,
    created_at: dateValue(order.created_at),
    email: order.email ?? null,
    status: order.status ?? null,
    payment_status: metadata?.[ORDER_META_PAYMENT_STATUS] ?? null,
    fulfillment_status: readOrderFulfillmentStatusMeta(metadata),
    currency_code: order.currency_code ?? null,
    total: readNumber(order.total),
    item_count: items.reduce((sum, item) => sum + (readNumber(item.quantity) ?? 0), 0),
    preview_items: items.slice(0, 3).map((item) => ({
      title: item.title ?? "Untitled item",
      thumbnail: item.thumbnail ?? null,
      quantity: readNumber(item.quantity) ?? 0,
    })),
  }
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const headerError = validateHeaders(req)
    if (headerError) {
      return res.status(401).json({
        error: { code: "CUSTOMER_ORDERS_HEADER_REQUIRED", message: headerError },
      })
    }

    const customerId = readAuthCustomerId(req)
    if (!customerId) {
      return res.status(401).json({ error: "Customer session is required" })
    }

    const limit = readPositiveInt(req.query?.limit, 20, 50)
    const offset = readPositiveInt(req.query?.offset, 0)
    const status = readStringFilter(req.query?.status)
    const paymentStatus = readStringFilter(req.query?.payment_status)
    const fulfillmentStatus = readStringFilter(req.query?.fulfillment_status)
    const storeId = resolveCurrentStore(req).store_id

    const orderModule = req.scope.resolve(Modules.ORDER)
    const selector: Record<string, unknown> = { customer_id: customerId }
    if (status) selector.status = status

    const orders = (await orderModule.listOrders(selector as never, {
      relations: ["items"],
      order: { created_at: "DESC" },
      take: 500,
    } as never)) as CustomerOrder[]

    const filtered = orders
      .filter((order) => order.customer_id === customerId)
      .filter((order) => readOrderStoreId(order) === storeId)
      .filter((order) => !paymentStatus || order.metadata?.[ORDER_META_PAYMENT_STATUS] === paymentStatus)
      .filter((order) => !fulfillmentStatus || readOrderFulfillmentStatusMeta(order.metadata ?? null) === fulfillmentStatus)

    const page = filtered.slice(offset, offset + limit)

    return res.status(200).json({
      orders: page.map(normalizeOrderSummary),
      count: filtered.length,
      limit,
      offset,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("authenticated customer orders failed:", error)
    return res.status(400).json({ error: message })
  }
}
