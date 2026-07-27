import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { resolveCurrentStore } from "../../../../../lib/store-context"
import { readOrderStoreId } from "../../../../../lib/order-store-context"
import { STORE_CORE_MODULE } from "../../../../../modules/store-core"
import { BUYER_REFUND_REQUESTS_MODULE } from "../../../../../modules/buyer-refund-requests"
import { matchesBuyerOrderBucket } from "../../../../../lib/customer-order-buckets"
import {
  buyerOrderDisplayStatusLabel,
  canConfirmReceipt,
  readReceiptConfirmed,
  resolveBuyerOrderDisplayStatus,
} from "../../../../../lib/buyer-order-display"
import {
  ORDER_META_PAYMENT_STATUS,
  ORDER_META_PLATFORM_CHECKOUT_COUNT,
  ORDER_META_PLATFORM_CHECKOUT_ID,
  ORDER_META_PLATFORM_CHECKOUT_INDEX,
  readOrderFulfillmentStatusMeta,
  readOrderFulfillmentStatusString,
  resolveBuyerOrderFulfillmentStatus,
} from "../../../../../lib/order-custom-metadata"
import { enrichOrderLineItemsWithImages, resolveOrderLineItemThumbnail } from "../../../../../lib/order-line-item-display"

type OrderLineItem = {
  title?: string | null
  thumbnail?: string | null
  quantity?: number | string | null
  variant_id?: string | null
  metadata?: Record<string, unknown> | null
}

type CustomerOrder = {
  id?: string
  display_id?: string | number | null
  displayId?: string | number | null
  customer_id?: string | null
  email?: string | null
  status?: string | null
  canceled_at?: string | Date | null
  cancelled_at?: string | Date | null
  created_at?: string | Date | null
  currency_code?: string | null
  total?: number | string | null
  metadata?: Record<string, unknown> | null
  items?: OrderLineItem[] | null
}

type CustomerRecord = {
  id?: string
  email?: string | null
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

const validateHeaders = (req: MedusaRequest, options?: { platformScope?: boolean }) => {
  if (!readHeader(req, "x-publishable-api-key")) {
    return "x-publishable-api-key is required"
  }

  if (!options?.platformScope && !readHeader(req, "x-store-id")) {
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

const readDisplayId = (order: CustomerOrder): string | number | null => {
  if (order.display_id !== undefined && order.display_id !== null) {
    return order.display_id
  }

  if (order.displayId !== undefined && order.displayId !== null) {
    return order.displayId
  }

  return null
}

const dateValue = (value: unknown) => {
  if (typeof value === "string") return value
  if (value instanceof Date) return value.toISOString()
  return null
}

const readOrderCustomerId = (order: CustomerOrder): string | null => {
  if (typeof order.customer_id === "string" && order.customer_id.trim()) {
    return order.customer_id.trim()
  }

  return null
}

const safeOrderShape = (order: CustomerOrder) => ({
  id: order.id,
  display_id: order.display_id ?? null,
  displayId: order.displayId ?? null,
  customer_id: order.customer_id ?? null,
  email: order.email ?? null,
  metadata_store_id: order.metadata?.store_id,
  keys: Object.keys(order),
})

const normalizeOrderSummary = (order: CustomerOrder, reviewedOrderIds = new Set<string>(), returnOrderIds = new Set<string>()) => {
  const metadata = order.metadata ?? null
  const items = order.items ?? []
  const paymentStatus = metadata?.[ORDER_META_PAYMENT_STATUS] ?? null
  const fulfillmentStatus = resolveBuyerOrderFulfillmentStatus(metadata)
  const receiptConfirmed = readReceiptConfirmed(order)
  const receiptConfirmationRequired = canConfirmReceipt({
    fulfillmentStatus,
    receiptConfirmed,
  })
  const reviewEligible =
    ["shipped", "delivered"].includes(fulfillmentStatus ?? "") &&
    receiptConfirmed &&
    Boolean(order.id) &&
    !reviewedOrderIds.has(order.id!)
  const reviewCompleted = Boolean(order.id) && reviewedOrderIds.has(order.id!)
  const displayStatus = resolveBuyerOrderDisplayStatus({
    status: order.canceled_at || order.cancelled_at ? "cancelled" : order.status ?? null,
    paymentStatus: typeof paymentStatus === "string" ? paymentStatus : null,
    fulfillmentStatus,
    receiptConfirmed,
    reviewEligible,
    reviewCompleted,
    returnIntent: Boolean(order.id) && returnOrderIds.has(order.id!),
  })

  return {
    order_id: order.id ?? "",
    display_id: readDisplayId(order),
    created_at: dateValue(order.created_at),
    email: order.email ?? null,
    status: order.canceled_at || order.cancelled_at ? "cancelled" : order.status ?? null,
    payment_status: paymentStatus,
    fulfillment_status: fulfillmentStatus,
    buyer_display_status: displayStatus,
    buyer_display_status_label: buyerOrderDisplayStatusLabel(displayStatus),
    receipt_confirmation_required: receiptConfirmationRequired,
    receipt_confirmed_at: typeof metadata?.buyer_confirmed_received_at === "string" ? metadata.buyer_confirmed_received_at : null,
    review_eligible: reviewEligible,
    review_completed: reviewCompleted,
    return_intent: Boolean(order.id) && returnOrderIds.has(order.id!),
    store_id: typeof metadata?.store_id === "string" ? metadata.store_id : null,
    platform_checkout_id:
      typeof metadata?.[ORDER_META_PLATFORM_CHECKOUT_ID] === "string"
        ? metadata[ORDER_META_PLATFORM_CHECKOUT_ID]
        : null,
    platform_checkout_index:
      typeof metadata?.[ORDER_META_PLATFORM_CHECKOUT_INDEX] === "number"
        ? metadata[ORDER_META_PLATFORM_CHECKOUT_INDEX]
        : null,
    platform_checkout_count:
      typeof metadata?.[ORDER_META_PLATFORM_CHECKOUT_COUNT] === "number"
        ? metadata[ORDER_META_PLATFORM_CHECKOUT_COUNT]
        : null,
    currency_code: order.currency_code ?? null,
    total: readNumber(order.total),
    item_count: items.reduce((sum, item) => sum + (readNumber(item.quantity) ?? 0), 0),
    preview_items: items.slice(0, 3).map((item) => ({
      title: item.title ?? "Untitled item",
      thumbnail: resolveOrderLineItemThumbnail(item),
      quantity: readNumber(item.quantity) ?? 0,
      product_id: typeof item.metadata?.mc_product_id === "string" ? item.metadata.mc_product_id : null,
      variant_id: typeof item.variant_id === "string" ? item.variant_id : null,
    })),
  }
}

const loadOrdersWithOrderModule = async (
  req: MedusaRequest,
  selector: Record<string, unknown>
): Promise<CustomerOrder[]> => {
  const orderModule = req.scope.resolve(Modules.ORDER)
  return (await orderModule.listOrders(selector as never, {
    select: [
      "id",
      "display_id",
      "customer_id",
      "email",
      "status",
      "canceled_at",
      "created_at",
      "currency_code",
      "metadata",
    ],
    relations: ["items"],
    order: { created_at: "DESC" },
    take: 500,
  } as never)) as CustomerOrder[]
}

const loadOrdersWithQueryGraph = async (
  req: MedusaRequest,
  selector: Record<string, unknown>
): Promise<CustomerOrder[]> => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = (await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "customer_id",
      "email",
      "status",
      "canceled_at",
      "created_at",
      "currency_code",
      "metadata",
      "items.title",
      "items.thumbnail",
      "items.quantity",
      "items.variant_id",
      "items.metadata",
    ],
    filters: selector,
    pagination: {
      take: 500,
      order: { created_at: "DESC" },
    },
  } as never)) as { data: CustomerOrder[] }
  return data ?? []
}

const loadCustomerOrders = async (
  req: MedusaRequest,
  selector: Record<string, unknown>
): Promise<{ orders: CustomerOrder[]; source: "order_module" | "query_graph" }> => {
  try {
    const graphOrders = await loadOrdersWithQueryGraph(req, selector)
    if (graphOrders.length > 0) {
      return { orders: graphOrders, source: "query_graph" }
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[customer-orders] query graph load failed", {
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const moduleOrders = await loadOrdersWithOrderModule(req, selector)
  return { orders: moduleOrders, source: "order_module" }
}

const assertOwnershipWasEnforced = (
  selector: Record<string, unknown>,
  customerId: string
) => {
  if (selector.customer_id !== customerId) {
    throw new Error("Order ownership was not enforced")
  }
}

const orderMatchesAuthenticatedCustomer = (
  order: CustomerOrder,
  customerId: string
) => {
  const dtoCustomerId = readOrderCustomerId(order)
  return !dtoCustomerId || dtoCustomerId === customerId
}

const readCustomerEmailForDiagnostics = async (
  req: MedusaRequest,
  customerId: string
): Promise<string | null> => {
  try {
    const customerModule = req.scope.resolve(Modules.CUSTOMER) as {
      retrieveCustomer?: (id: string) => Promise<CustomerRecord>
    }
    const customer = await customerModule.retrieveCustomer?.(customerId)
    return customer?.email?.trim().toLowerCase() ?? null
  } catch {
    return null
  }
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const scope = readStringFilter(req.query?.scope)
    const platformScope = scope === "platform" || scope === "all"
    const headerError = validateHeaders(req, { platformScope })
    if (headerError) {
      return res.status(401).json({
        error: { code: "CUSTOMER_ORDERS_HEADER_REQUIRED", message: headerError },
      })
    }

    const customerId = readAuthCustomerId(req)
    if (!customerId) {
      return res.status(401).json({ error: "Customer session is required" })
    }

    const { assertActiveCustomer } = await import("../../../../../lib/customer-session")
    if (!(await assertActiveCustomer(req, res, customerId))) return

    const limit = readPositiveInt(req.query?.limit, 20, 100)
    const offset = readPositiveInt(req.query?.offset, 0)
    const status = readStringFilter(req.query?.status)
    const paymentStatus = readStringFilter(req.query?.payment_status)
    const fulfillmentStatus = readStringFilter(req.query?.fulfillment_status)
    const bucket = readStringFilter(req.query?.bucket)
    const storeId = resolveCurrentStore(req).store_id

    const selector: Record<string, unknown> = { customer_id: customerId }
    if (status) selector.status = status
    assertOwnershipWasEnforced(selector, customerId)

    const { orders, source } = await loadCustomerOrders(req, selector)

    const filtered = orders
      .filter((order) => orderMatchesAuthenticatedCustomer(order, customerId))
      .filter((order) => platformScope || readOrderStoreId(order) === storeId)
      .filter((order) => !paymentStatus || order.metadata?.[ORDER_META_PAYMENT_STATUS] === paymentStatus)
      .filter((order) => !fulfillmentStatus || resolveBuyerOrderFulfillmentStatus(order.metadata ?? null) === fulfillmentStatus)

    let reviewedOrderIds = new Set<string>()
    let returnOrderIds = new Set<string>()
    try {
      const storeCore = req.scope.resolve(STORE_CORE_MODULE) as any
      const reviews = platformScope
        ? await storeCore.listProductReviews({ status: "published" })
        : await storeCore.listProductReviews({ store_id: storeId, status: "published" })
      reviewedOrderIds = new Set(reviews.map((review: any) => review.order_id).filter(Boolean))
      const refunds = req.scope.resolve(BUYER_REFUND_REQUESTS_MODULE) as any
      const requests = platformScope
        ? await refunds.listBuyerRefundRequests({ customer_id: customerId })
        : await refunds.listBuyerRefundRequests({ customer_id: customerId, store_id: storeId })
      returnOrderIds = new Set(requests.map((request: any) => request.order_id).filter(Boolean))
    } catch {
      // Optional aggregates remain empty if a module is unavailable.
    }
    const bucketed = bucket
      ? filtered.filter((order) =>
          matchesBuyerOrderBucket({
            bucket,
            status: order.canceled_at || order.cancelled_at ? "cancelled" : order.status ?? null,
            paymentStatus: String(order.metadata?.[ORDER_META_PAYMENT_STATUS] ?? ""),
            fulfillmentStatus: resolveBuyerOrderFulfillmentStatus(order.metadata ?? null) ?? "none",
            orderId: order.id,
            receiptConfirmed: readReceiptConfirmed(order),
            reviewEligible:
              ["shipped", "delivered"].includes(resolveBuyerOrderFulfillmentStatus(order.metadata ?? null) ?? "") &&
              readReceiptConfirmed(order) &&
              Boolean(order.id) &&
              !reviewedOrderIds.has(order.id!),
            reviewedOrderIds,
            returnOrderIds,
          })
        )
      : filtered
    const page = bucketed.slice(offset, offset + limit)
    const applyPreviewImages = async (ordersPage: CustomerOrder[]) => {
      const withSyncThumbnails = ordersPage.map((order) => ({
        ...order,
        items: order.items?.map((item) => ({
          ...item,
          thumbnail: resolveOrderLineItemThumbnail(item),
        })),
      }))

      try {
        const storeCore = req.scope.resolve(STORE_CORE_MODULE) as {
          listProducts: (filters: Record<string, unknown>) => Promise<Array<Record<string, unknown>>>
        }
        return Promise.all(
          withSyncThumbnails.map(async (order) => ({
            ...order,
            items: order.items?.length
              ? await enrichOrderLineItemsWithImages(storeCore, order.items)
              : order.items,
          }))
        )
      } catch {
        return withSyncThumbnails
      }
    }
    const pageWithImages = await applyPreviewImages(page)
    if (process.env.NODE_ENV !== "production") {
      const customerEmail = await readCustomerEmailForDiagnostics(req, customerId)
      let sameEmailUnownedCount: number | undefined
      if (customerEmail) {
        try {
          const sameEmailOrders = await loadOrdersWithOrderModule(req, { email: customerEmail })
          sameEmailUnownedCount = sameEmailOrders.filter(
            (order) => !readOrderCustomerId(order) && readOrderStoreId(order) === storeId
          ).length
        } catch {
          sameEmailUnownedCount = undefined
        }
      }
      const dtoCustomerMatched = orders.filter((order) => readOrderCustomerId(order) === customerId)
      const dtoCustomerMissing = orders.filter((order) => !readOrderCustomerId(order))
      const customerMatchedByProvenance = orders.filter((order) => orderMatchesAuthenticatedCustomer(order, customerId))
      const storeMatched = customerMatchedByProvenance.filter((order) => readOrderStoreId(order) === storeId)
      console.info("[customer-orders] list counts", {
        auth_customer_id: customerId,
        requested_store_id: storeId,
        query_source: source,
        raw_query_selector: selector,
        raw_order_count: orders.length,
        customer_matched_count: customerMatchedByProvenance.length,
        dto_customer_matched_count: dtoCustomerMatched.length,
        dto_customer_missing_count: dtoCustomerMissing.length,
        store_matched_count: storeMatched.length,
        returned_count: page.length,
        returned_order_ids: page.map((order) => order.id).filter(Boolean),
        same_email_unowned_store_order_count: sameEmailUnownedCount,
        first_order_shape: orders[0] ? safeOrderShape(orders[0]) : null,
      })
    }

    return res.status(200).json({
      orders: pageWithImages.map((order) => normalizeOrderSummary(order, reviewedOrderIds, returnOrderIds)),
      count: bucketed.length,
      limit,
      offset,
    })
  } catch (error: unknown) {
    console.error("authenticated customer orders failed:", error)
    return res.status(500).json({
      error: {
        code: "CUSTOMER_ORDERS_LIST_ERROR",
        message: "Failed to retrieve customer orders",
      },
    })
  }
}
