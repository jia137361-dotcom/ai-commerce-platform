import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { assertOrderBelongsToCurrentStore, readOrderStoreId } from "../../../../../lib/order-store-context"
import { OrderStoreAccessError } from "../../../../../lib/order-store-error"
import {
  ORDER_META_PAYMENT_STATUS,
  readOrderFulfillmentStatusMeta,
} from "../../../../../lib/order-custom-metadata"
import {
  cancellationResponse,
  evaluateCancellationEligibility,
  loadCancellationContext,
} from "../../../../../lib/order-cancellation"
import {
  evaluateRefundRequestEligibility,
  serializeBuyerRefundRequest,
  type BuyerRefundRequestRecord,
} from "../../../../../lib/order-refund-request"
import { resolveCurrentStore } from "../../../../../lib/store-context"
import { BUYER_REFUND_REQUESTS_MODULE } from "../../../../../modules/buyer-refund-requests"
import type BuyerRefundRequestsModuleService from "../../../../../modules/buyer-refund-requests/service"

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

type DetailOrder = {
  id?: string
  customer_id?: string | null
  email?: string | null
  metadata?: Record<string, unknown> | null
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

const normalizeEmail = (email?: string) => email?.trim().toLowerCase() ?? ""

const readAuthCustomerId = (req: MedusaRequest) =>
  (req as AuthenticatedRequest).auth_context?.actor_id

const hasAuthenticatedAccess = (req: MedusaRequest, order: DetailOrder) => {
  const customerId = readAuthCustomerId(req)
  return Boolean(customerId && order.customer_id && order.customer_id === customerId)
}

const hasAuthenticatedMismatch = (req: MedusaRequest, order: DetailOrder) => {
  const customerId = readAuthCustomerId(req)
  return Boolean(customerId && order.customer_id && order.customer_id !== customerId)
}

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
    const orderModule = req.scope.resolve(Modules.ORDER)
    const order = await orderModule.retrieveOrder(orderId, {
      relations: ["items", "shipping_address", "billing_address"],
    })

    assertOrderBelongsToCurrentStore(req, order)

    const hasAuthAccess = hasAuthenticatedAccess(req, order)
    if (hasAuthenticatedMismatch(req, order)) {
      return res.status(403).json({ error: "Customer does not match order" })
    }

    if (!hasAuthAccess && !email) {
      return res.status(400).json({ error: "email query parameter is required" })
    }

    if (!hasAuthAccess && (!order.email || normalizeEmail(order.email) !== email)) {
      return res.status(403).json({ error: "Email does not match order" })
    }

    const metadata = order.metadata as Record<string, unknown> | null
    const storeId = resolveCurrentStore(req).store_id
    const cancellationContext = hasAuthAccess
      ? await loadCancellationContext(req, orderId, order)
      : null
    const cancellation = hasAuthAccess && cancellationContext
      ? cancellationResponse(evaluateCancellationEligibility(cancellationContext, {
        authCustomerId: readAuthCustomerId(req),
        requestedStoreId: storeId,
      }))
      : {
        allowed: false,
        code: "ORDER_ACCESS_DENIED",
        message: "Guest order detail cannot cancel orders.",
      }
    let refundRequest: Record<string, unknown>
    if (hasAuthAccess && cancellationContext) {
      const service = req.scope.resolve(BUYER_REFUND_REQUESTS_MODULE) as BuyerRefundRequestsModuleService & {
        listBuyerRefundRequests: (
          filters: Record<string, unknown>,
          config?: Record<string, unknown>
        ) => Promise<BuyerRefundRequestRecord[]>
      }
      const existingRequests = await service.listBuyerRefundRequests(
        {
          order_id: orderId,
          customer_id: readAuthCustomerId(req),
          store_id: storeId,
        },
        { order: { created_at: "DESC" } }
      )
      const eligibility = evaluateRefundRequestEligibility(cancellationContext, {
        authCustomerId: readAuthCustomerId(req),
        requestedStoreId: storeId,
        existingRequests,
      })
      const openRequest = existingRequests.find((request) =>
        ["pending", "approved", "processing"].includes(request.status ?? "")
      )
      refundRequest = {
        allowed: eligibility.allowed,
        code: eligibility.allowed ? null : eligibility.code,
        message: eligibility.allowed ? null : eligibility.message,
        requested_amount: eligibility.allowed ? eligibility.requestedAmount : null,
        currency_code: eligibility.allowed ? eligibility.currencyCode : null,
        open_request: openRequest ? serializeBuyerRefundRequest(openRequest) : null,
      }
    } else {
      refundRequest = {
        allowed: false,
        code: "ORDER_ACCESS_DENIED",
        message: "Guest order detail cannot request refunds.",
        open_request: null,
      }
    }

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
      cancellation,
      refund_request: refundRequest,
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
