import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { assertOrderBelongsToCurrentStore, readOrderStoreId } from "../../../../../lib/order-store-context"
import { OrderStoreAccessError } from "../../../../../lib/order-store-error"
import { enrichOrderWithSummaryTotals, minorMoneyToMajor, readOrderMoney, resolveBuyerOrderTotalsForStorefront } from "../../../../../lib/buyer-order-totals"
import {
  ORDER_META_COUPON_DISCOUNT,
  ORDER_META_PLAN_DISCOUNT,
} from "../../../../../lib/store-coupons"
import { enrichOrderLineItemsWithImages, resolveOrderLineItemThumbnail } from "../../../../../lib/order-line-item-display"
import {
  ORDER_META_PAYMENT_STATUS,
  resolveBuyerOrderFulfillmentStatus,
} from "../../../../../lib/order-custom-metadata"
import { canConfirmReceipt, readReceiptConfirmed } from "../../../../../lib/buyer-order-display"
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
import { STORE_CORE_MODULE } from "../../../../../modules/store-core"
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

const readNumber = (value: unknown): number | null => readOrderMoney(value)

const normalizeItem = (item: OrderLineItem) => {
  const unitPriceMinor = readNumber(item.unit_price)
  const quantity = readNumber(item.quantity) ?? 0
  const subtotalMinor =
    readNumber(item.subtotal) ??
    readNumber(item.total) ??
    (unitPriceMinor != null ? unitPriceMinor * quantity : null)
  const metadata = item.metadata ?? null
  const mcProductId =
    metadata && typeof metadata.mc_product_id === "string" ? metadata.mc_product_id : null
  return {
    id: item.id ?? "",
    // Prefer store-core id so Order again / product links resolve on the buyer PDP.
    product_id: mcProductId ?? item.product_id ?? null,
    variant_id: item.variant_id ?? null,
    title: item.title ?? item.product_title ?? "Untitled item",
    variant_title: item.variant_title ?? null,
    thumbnail: resolveOrderLineItemThumbnail(item),
    quantity,
    unit_price: minorMoneyToMajor(unitPriceMinor),
    subtotal: minorMoneyToMajor(subtotalMinor),
    metadata,
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
    const retrievedOrder = await orderModule.retrieveOrder(orderId, {
      relations: ["items", "shipping_address", "billing_address"],
    })
    const enrichedOrder = await enrichOrderWithSummaryTotals(
      req,
      orderId,
      retrievedOrder as unknown as Record<string, unknown>
    )
    const totals = resolveBuyerOrderTotalsForStorefront(enrichedOrder)

    assertOrderBelongsToCurrentStore(req, retrievedOrder)

    const hasAuthAccess = hasAuthenticatedAccess(req, retrievedOrder)
    if (hasAuthenticatedMismatch(req, retrievedOrder)) {
      return res.status(403).json({ error: "Customer does not match order" })
    }

    if (!hasAuthAccess && !email) {
      return res.status(400).json({ error: "email query parameter is required" })
    }

    if (!hasAuthAccess && (!retrievedOrder.email || normalizeEmail(retrievedOrder.email) !== email)) {
      return res.status(403).json({ error: "Email does not match order" })
    }

    const metadata = retrievedOrder.metadata as Record<string, unknown> | null
    const storeId = resolveCurrentStore(req).store_id
    const cancellationContext = hasAuthAccess
      ? await loadCancellationContext(req, orderId, retrievedOrder)
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

    const responseItems = (retrievedOrder.items?.length
      ? retrievedOrder.items
      : (enrichedOrder.items as OrderLineItem[] | undefined) ?? []) as OrderLineItem[]
    const storeCore = req.scope.resolve(STORE_CORE_MODULE) as {
      listProducts: (filters: Record<string, unknown>) => Promise<Array<Record<string, unknown>>>
    }
    const displayItems = await enrichOrderLineItemsWithImages(storeCore, responseItems)

    const couponDiscountMajor =
      typeof metadata?.[ORDER_META_COUPON_DISCOUNT] === "number"
        ? metadata[ORDER_META_COUPON_DISCOUNT]
        : typeof metadata?.discount_total_major === "number"
          ? null
          : null
    const planDiscountMajor =
      typeof metadata?.[ORDER_META_PLAN_DISCOUNT] === "number" ? metadata[ORDER_META_PLAN_DISCOUNT] : 0
    const metaDiscountMajor =
      typeof metadata?.discount_total_major === "number"
        ? metadata.discount_total_major
        : (typeof couponDiscountMajor === "number" ? couponDiscountMajor : 0) +
          (typeof planDiscountMajor === "number" ? planDiscountMajor : 0)
    const metaPayable =
      typeof metadata?.payable_total_major === "number" ? metadata.payable_total_major : null

    const discountTotal =
      metaDiscountMajor > 0 ? metaDiscountMajor : totals.discountTotal
    const total =
      metaPayable != null
        ? metaPayable
        : discountTotal && totals.subtotal != null
          ? Math.max(
              0,
              (totals.subtotal ?? 0) + (totals.shippingTotal ?? 0) - discountTotal + (totals.taxTotal ?? 0)
            )
          : totals.total

    res.status(200).json({
      order_id: retrievedOrder.id,
      display_id: retrievedOrder.display_id ?? null,
      store_id: readOrderStoreId(retrievedOrder),
      email: retrievedOrder.email ?? null,
      status: retrievedOrder.status ?? null,
      payment_status: metadata?.[ORDER_META_PAYMENT_STATUS] ?? null,
      fulfillment_status: resolveBuyerOrderFulfillmentStatus(metadata),
      receipt_confirmation_required: canConfirmReceipt({
        fulfillmentStatus: resolveBuyerOrderFulfillmentStatus(metadata),
        receiptConfirmed: readReceiptConfirmed(retrievedOrder),
      }),
      receipt_confirmed_at: typeof metadata?.buyer_confirmed_received_at === "string"
        ? metadata.buyer_confirmed_received_at
        : null,
      created_at: retrievedOrder.created_at ?? null,
      currency_code: retrievedOrder.currency_code ?? null,
      items: displayItems.map(normalizeItem),
      shipping_address: retrievedOrder.shipping_address ?? null,
      billing_address: retrievedOrder.billing_address ?? null,
      subtotal: totals.subtotal,
      shipping_total: totals.shippingTotal,
      discount_total: discountTotal,
      tax_total: totals.taxTotal,
      total,
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
