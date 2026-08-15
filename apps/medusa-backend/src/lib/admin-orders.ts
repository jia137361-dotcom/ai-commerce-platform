import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { resolveOrderLineItemThumbnail } from "./order-line-item-display"
import {
  ORDER_META_PAYMENT_STATUS,
  readOrderFulfillmentStatusMeta,
  toMedusaAdminOrderFulfillmentStatus,
  toMedusaAdminOrderPaymentStatus,
} from "./order-custom-metadata"

export type FulfillmentStepKey =
  | "waiting"
  | "pushed"
  | "in_production"
  | "shipped"
  | "delivered"

export type FulfillmentTimelineStep = {
  key: FulfillmentStepKey
  label: string
  status: "pending" | "active" | "completed"
  timestamp: string | null
}

const STEP_LABELS: Record<FulfillmentStepKey, string> = {
  waiting: "Waiting",
  pushed: "Pushed",
  in_production: "In Production",
  shipped: "Shipped",
  delivered: "Delivered",
}

export const buildFulfillmentTimeline = (input: {
  mcFulfillmentStatus: string | null
  fulfillmentOrder: Record<string, unknown> | null
  latestShipment: Record<string, unknown> | null
  orderCreatedAt?: string | Date | null
}): FulfillmentTimelineStep[] => {
  const mc = input.mcFulfillmentStatus ?? "none"
  const fo = input.fulfillmentOrder
  const ship = input.latestShipment

  const pushedAt = fo?.pushed_at ? String(fo.pushed_at) : null
  const shippedAt = ship?.shipped_at ? String(ship.shipped_at) : null
  const deliveredAt = ship?.delivered_at ? String(ship.delivered_at) : null

  const waitingDone = mc !== "none" && mc !== "waiting"
  const pushedDone = ["pushed", "shipped"].includes(mc) || Boolean(pushedAt)
  const inProdDone = pushedDone && (fo?.status === "pushed" || fo?.status === "fulfilled")
  const shippedDone = mc === "shipped" || Boolean(shippedAt)
  const deliveredDone = Boolean(deliveredAt) && ship?.status === "delivered"

  const steps: FulfillmentStepKey[] = [
    "waiting",
    "pushed",
    "in_production",
    "shipped",
    "delivered",
  ]

  const completion = [waitingDone, pushedDone, inProdDone, shippedDone, deliveredDone]

  return steps.map((key, index) => {
    const done = completion[index]
    const prevDone = index === 0 ? true : completion[index - 1]
    let status: FulfillmentTimelineStep["status"] = "pending"
    if (done) {
      status = "completed"
    } else if (prevDone) {
      status = "active"
    }

    let timestamp: string | null = null
    switch (key) {
      case "waiting":
        timestamp = input.orderCreatedAt ? String(input.orderCreatedAt) : null
        break
      case "pushed":
        timestamp = pushedAt
        break
      case "in_production":
        timestamp = pushedAt
        break
      case "shipped":
        timestamp = shippedAt
        break
      case "delivered":
        timestamp = deliveredAt
        break
    }

    return { key, label: STEP_LABELS[key], status, timestamp }
  })
}

export const parseAdminOrdersListQuery = (query: Record<string, unknown>) => {
  const limit = Math.min(Math.max(Number(query.limit ?? 50) || 50, 1), 200)
  const offset = Math.max(Number(query.offset ?? 0) || 0, 0)
  const email =
    typeof query.email === "string" && query.email.trim()
      ? query.email.trim().toLowerCase()
      : undefined
  const displayIdRaw =
    typeof query.display_id === "string" && query.display_id.trim()
      ? query.display_id.trim()
      : undefined
  const display_id =
    displayIdRaw !== undefined && Number.isFinite(Number(displayIdRaw))
      ? Number(displayIdRaw)
      : undefined

  return { limit, offset, email, display_id }
}

export const mergeAdminOrderMetadata = (
  orders: Array<Record<string, unknown>>,
  metadataRows: Array<{ id: string; metadata?: Record<string, unknown> | null }>
): Array<Record<string, unknown> & { metadata?: Record<string, unknown> | null }> => {
  const metadataByOrderId = new Map(metadataRows.map((row) => [row.id, row.metadata]))
  return orders.map((order) => {
    const currentMetadata =
      order.metadata && typeof order.metadata === "object"
        ? (order.metadata as Record<string, unknown>)
        : null
    return {
      ...order,
      metadata:
        (typeof order.id === "string" ? metadataByOrderId.get(order.id) : undefined) ??
        currentMetadata,
    }
  })
}

const ADMIN_ORDER_GRAPH_FIELDS = [
  "id",
  "email",
  "display_id",
  "metadata",
  "items.id",
  "items.title",
  "items.product_title",
  "items.subtitle",
  "items.thumbnail",
  "items.quantity",
  "items.unit_price",
  "items.total",
  "items.variant_id",
  "items.product_id",
  "items.metadata",
] as const

const ADMIN_ORDER_GRAPH_FIELDS_MINIMAL = ["id", "email", "display_id", "metadata"] as const

export type AdminSupplierSummary = {
  supplier_id: string | null
  supplier_order_id: string | null
  supplier_status: string | null
}

const readNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null

export const resolveAdminSupplierSummary = (
  fulfillmentOrder: Record<string, unknown> | null | undefined,
  supplierOrder: Record<string, unknown> | null | undefined
): AdminSupplierSummary => ({
  supplier_id:
    readNonEmptyString(supplierOrder?.supplier_id) ??
    readNonEmptyString(fulfillmentOrder?.supplier) ??
    null,
  supplier_order_id:
    readNonEmptyString(supplierOrder?.supplier_order_id) ??
    readNonEmptyString(fulfillmentOrder?.supplier_order_id) ??
    null,
  supplier_status:
    readNonEmptyString(supplierOrder?.supplier_status) ??
    readNonEmptyString(fulfillmentOrder?.status) ??
    null,
})

const loadAdminOrderGraphRow = async (
  scope: MedusaContainer,
  orderId: string
): Promise<Record<string, unknown> | null> => {
  const queryGraph = scope.resolve(ContainerRegistrationKeys.QUERY) as {
    graph: (input: never) => Promise<{ data?: Array<Record<string, unknown>> }>
  }
  const filters = { id: [orderId] }

  try {
    const { data } = await queryGraph.graph({
      entity: "order",
      fields: [...ADMIN_ORDER_GRAPH_FIELDS],
      filters,
      options: { throwIfKeyNotFound: false },
    } as never)
    if (data?.[0]) return data[0]
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[admin-orders] graph enrichment failed", {
        order_id: orderId,
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  try {
    const { data } = await queryGraph.graph({
      entity: "order",
      fields: [...ADMIN_ORDER_GRAPH_FIELDS_MINIMAL],
      filters,
      options: { throwIfKeyNotFound: false },
    } as never)
    return data?.[0] ?? null
  } catch {
    return null
  }
}

export type AdminOrderRecord = {
  id: string
  email?: string | null
  display_id?: number | null
  created_at?: string | Date | null
  currency_code?: string | null
  metadata?: Record<string, unknown> | null
  items?: unknown[]
  shipping_address?: Record<string, unknown> | null
}

export const hydrateAdminOrderFromGraph = (
  order: Record<string, unknown>,
  graphRow: Record<string, unknown> | null | undefined
): Record<string, unknown> => {
  if (!graphRow) return order

  const retrieveItems = Array.isArray(order.items) ? order.items : []
  const graphItems = Array.isArray(graphRow.items) ? graphRow.items : []

  return {
    ...order,
    email: order.email ?? graphRow.email,
    display_id: order.display_id ?? graphRow.display_id,
    metadata:
      (graphRow.metadata && typeof graphRow.metadata === "object"
        ? graphRow.metadata
        : undefined) ??
      order.metadata,
    items: retrieveItems.length > 0 ? retrieveItems : graphItems,
    shipping_address: order.shipping_address ?? null,
  }
}

export const loadAdminOrderRecord = async (
  scope: MedusaContainer,
  orderId: string
): Promise<AdminOrderRecord> => {
  const orderModule = scope.resolve(Modules.ORDER)

  const order = await orderModule.retrieveOrder(orderId, {
    relations: ["items", "shipping_address"],
  })

  const graphRow = await loadAdminOrderGraphRow(scope, orderId)
  const [withMetadata] = mergeAdminOrderMetadata(
    [order as unknown as Record<string, unknown>],
    graphRow
      ? ([graphRow] as Array<{ id: string; metadata?: Record<string, unknown> | null }>)
      : []
  )

  const hydrated = hydrateAdminOrderFromGraph(withMetadata, graphRow)

  return {
    ...hydrated,
    id: order.id,
    created_at: order.created_at,
    currency_code: order.currency_code,
  } as AdminOrderRecord
}

export const serializeAdminOrderSummary = (input: {
  order: AdminOrderRecord
  fulfillmentOrder?: Record<string, unknown> | null
  supplierOrder?: Record<string, unknown> | null
}) => {
  const meta = input.order.metadata as Record<string, unknown> | null
  const mcPayment = meta?.[ORDER_META_PAYMENT_STATUS] ?? null
  const paymentMethodLabel =
    typeof meta?.payment_method_label === "string" && meta.payment_method_label.trim()
      ? meta.payment_method_label.trim()
      : null
  const mcFulfillment = readOrderFulfillmentStatusMeta(meta)

  return {
    order_id: input.order.id,
    display_id: input.order.display_id ?? null,
    email: input.order.email ?? null,
    shipping_address: input.order.shipping_address ?? null,
    payment_status: toMedusaAdminOrderPaymentStatus(mcPayment),
    payment_method_label: paymentMethodLabel,
    mc_payment_status: mcPayment ?? null,
    fulfillment_status: toMedusaAdminOrderFulfillmentStatus(mcFulfillment),
    mc_fulfillment_status: mcFulfillment ?? null,
    supplier: resolveAdminSupplierSummary(input.fulfillmentOrder, input.supplierOrder),
  }
}

const readOrderNumeric = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

/**
 * Convert a Medusa minor-unit (cents) amount to major units (dollars).
 * Medusa always stores order totals in cents — no heuristic needed.
 */
const normalizeMoney = (value: number | null): number | null => {
  if (value == null || !Number.isFinite(value)) return null
  return value / 100
}

export { normalizeMoney }

export const summarizeAdminOrderRow = (order: Record<string, unknown>) => {
  const items = Array.isArray(order.items) ? order.items : []
  const items_count = items.reduce((sum, item) => {
    const row = item as Record<string, unknown>
    return sum + (readOrderNumeric(row.quantity) ?? 0)
  }, 0)

  let total = normalizeMoney(readOrderNumeric(order.total))
  if (total == null && items.length) {
    const computed = items.reduce((sum, item) => {
      const row = item as Record<string, unknown>
      const lineTotal = normalizeMoney(readOrderNumeric(row.total))
      if (lineTotal != null) return sum + lineTotal
      const unit = normalizeMoney(readOrderNumeric(row.unit_price)) ?? 0
      const qty = readOrderNumeric(row.quantity) ?? 0
      return sum + unit * qty
    }, 0)
    total = computed > 0 ? computed : null
  }

  return { items_count, total }
}

export const normalizeOrderLineItem = (item: Record<string, unknown>) => {
  const meta =
    item.metadata && typeof item.metadata === "object"
      ? (item.metadata as Record<string, unknown>)
      : {}
  return {
    id: item.id,
    title: item.title ?? item.product_title ?? null,
    subtitle: item.subtitle ?? null,
    thumbnail: resolveOrderLineItemThumbnail(item),
    quantity: item.quantity ?? 1,
    unit_price: item.unit_price ?? null,
    total: item.total ?? null,
    variant_id: item.variant_id ?? null,
    product_id: item.product_id ?? null,
    metadata: meta,
    mc_product_id: meta.mc_product_id ?? null,
    supplier_product_id: meta.supplier_product_id ?? null,
    print_file_url: meta.print_file_url ?? null,
  }
}
