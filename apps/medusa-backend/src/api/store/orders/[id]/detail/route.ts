import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { assertOrderBelongsToCurrentStore, readOrderStoreId } from "../../../../../lib/order-store-context"
import { OrderStoreAccessError } from "../../../../../lib/order-store-error"
import {
  ORDER_META_PAYMENT_STATUS,
  readOrderFulfillmentStatusMeta,
} from "../../../../../lib/order-custom-metadata"

type OrderLineItem = {
  id?: string
  product_id?: string | null
  variant_id?: string | null
  title?: string | null
  product_title?: string | null
  variant_title?: string | null
  thumbnail?: string | null
  quantity?: number | string | null
  unit_price?: number | string | null
  subtotal?: number | string | null
  total?: number | string | null
  metadata?: Record<string, unknown> | null
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

const normalizeEmail = (email?: string) => email?.trim().toLowerCase() ?? ""

const readNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const normalizeItem = (item: OrderLineItem) => {
  const unitPrice = readNumber(item.unit_price)
  const subtotal = readNumber(item.subtotal) ?? readNumber(item.total)
  return {
    id: item.id ?? "",
    product_id: item.product_id ?? null,
    variant_id: item.variant_id ?? null,
    title: item.title ?? item.product_title ?? "Untitled item",
    variant_title: item.variant_title ?? null,
    thumbnail: item.thumbnail ?? null,
    quantity: readNumber(item.quantity) ?? 0,
    unit_price: unitPrice,
    subtotal,
    metadata: item.metadata ?? null,
  }
}

const isNotFoundError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  return /not found|does not exist|could not be found/i.test(message)
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const headerError = validateHeaders(req)
    if (headerError) {
      return res.status(401).json({
        error: { code: "ORDER_DETAIL_HEADER_REQUIRED", message: headerError },
      })
    }

    const orderId = req.params.id as string
    const email = normalizeEmail(req.query?.email as string | undefined)
    if (!email) {
      return res.status(400).json({ error: "email query parameter is required" })
    }

    const orderModule = req.scope.resolve(Modules.ORDER)
    const order = await orderModule.retrieveOrder(orderId, {
      relations: ["items", "shipping_address", "billing_address"],
    })

    assertOrderBelongsToCurrentStore(req, order)

    if (!order.email || normalizeEmail(order.email) !== email) {
      return res.status(403).json({ error: "Email does not match order" })
    }

    const metadata = order.metadata as Record<string, unknown> | null

    res.status(200).json({
      order_id: order.id,
      display_id: order.display_id ?? null,
      store_id: readOrderStoreId(order),
      email: order.email ?? null,
      status: order.status ?? null,
      payment_status: metadata?.[ORDER_META_PAYMENT_STATUS] ?? null,
      fulfillment_status: readOrderFulfillmentStatusMeta(metadata),
      created_at: order.created_at ?? null,
      currency_code: order.currency_code ?? null,
      items: ((order.items ?? []) as OrderLineItem[]).map(normalizeItem),
      shipping_address: order.shipping_address ?? null,
      billing_address: order.billing_address ?? null,
      subtotal: readNumber(order.subtotal),
      shipping_total: readNumber(order.shipping_total),
      discount_total: readNumber(order.discount_total),
      tax_total: readNumber(order.tax_total),
      total: readNumber(order.total),
    })
  } catch (error: unknown) {
    if (error instanceof OrderStoreAccessError) {
      return res.status(403).json({
        error: { code: error.code, message: error.message },
      })
    }

    if (isNotFoundError(error)) {
      return res.status(404).json({ error: "Order not found" })
    }

    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("订单 detail 失败:", error)
    res.status(400).json({ error: message })
  }
}
