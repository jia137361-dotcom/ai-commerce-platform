import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { normalizeMajor } from "./money"

export type BuyerOrderTotals = {
  subtotal: number | null
  shippingTotal: number | null
  discountTotal: number | null
  taxTotal: number | null
  total: number | null
}

const TOTAL_FIELD_ALIASES: Record<keyof BuyerOrderTotals, string[]> = {
  subtotal: ["subtotal", "item_subtotal", "items_total", "item_total"],
  shippingTotal: ["shipping_total", "shipping_subtotal", "shipping"],
  discountTotal: ["discount_total", "discount_subtotal", "discount"],
  taxTotal: ["tax_total", "tax_subtotal", "tax"],
  total: [
    "total",
    "current_order_total",
    "original_order_total",
    "accounting_total",
    "paid_total",
    "order_total",
  ],
}

export const readOrderMoney = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  if (value && typeof value === "object") {
    const candidate = value as { value?: unknown; numeric?: unknown; amount?: unknown }
    return (
      readOrderMoney(candidate.numeric) ??
      readOrderMoney(candidate.value) ??
      readOrderMoney(candidate.amount)
    )
  }
  return null
}

const readTotalsBucket = (
  bucket: Record<string, unknown> | null | undefined,
  aliases: string[]
) => {
  if (!bucket) return null
  for (const key of aliases) {
    const value = readOrderMoney(bucket[key])
    if (value != null) return value
  }
  return null
}

const readLineItemUnitPrice = (item: Record<string, unknown>) =>
  readOrderMoney(item.unit_price) ?? readOrderMoney(item.raw_unit_price)

const readLineItemSubtotal = (item: Record<string, unknown>) => {
  const unitPrice = readLineItemUnitPrice(item)
  const quantity = readOrderMoney(item.quantity)
  const fromUnitPrice =
    unitPrice != null && quantity != null ? unitPrice * quantity : null

  const subtotal = readOrderMoney(item.subtotal)
  const total = readOrderMoney(item.total)

  if (subtotal != null && subtotal > 0) return subtotal
  if (total != null && total > 0) return total
  return fromUnitPrice
}

const sumLineItems = (items: unknown) => {
  if (!Array.isArray(items) || !items.length) return null
  let sum = 0
  let found = false
  for (const item of items) {
    if (!item || typeof item !== "object") continue
    const lineSubtotal = readLineItemSubtotal(item as Record<string, unknown>)
    if (lineSubtotal == null) continue
    sum += lineSubtotal
    found = true
  }
  return found ? sum : null
}

const readPaymentCollectionTotal = (order: Record<string, unknown>) => {
  const collections = order.payment_collections
  if (!Array.isArray(collections)) return null
  for (const collection of collections) {
    if (!collection || typeof collection !== "object") continue
    const row = collection as Record<string, unknown>
    const captured =
      readOrderMoney(row.captured_amount) ??
      readOrderMoney(row.raw_captured_amount) ??
      readOrderMoney(row.amount)
    if (captured != null && captured > 0) return captured
  }
  return null
}

const readSummaryTotalsBucket = (order: Record<string, unknown>) => {
  const summary =
    order.summary && typeof order.summary === "object"
      ? (order.summary as Record<string, unknown>)
      : null
  return summary?.totals && typeof summary.totals === "object"
    ? (summary.totals as Record<string, unknown>)
    : null
}

const computeOrderTotal = (
  subtotal: number | null,
  shippingTotal: number | null,
  discountTotal: number | null,
  taxTotal: number | null
) => {
  if (subtotal == null && shippingTotal == null) return null
  return (
    (subtotal ?? 0) +
    (shippingTotal ?? 0) -
    (discountTotal ?? 0) +
    (taxTotal ?? 0)
  )
}

const pickOrderTotal = (input: {
  lineSubtotal: number | null
  subtotal: number | null
  shippingTotal: number | null
  discountTotal: number
  taxTotal: number
  summaryTotal: number | null
  recordedTotal: number | null
}) => {
  const computedTotal = computeOrderTotal(
    input.subtotal,
    input.shippingTotal,
    input.discountTotal,
    input.taxTotal
  )

  if (input.summaryTotal != null && input.lineSubtotal != null) {
    if (input.summaryTotal >= input.lineSubtotal) {
      return input.summaryTotal
    }
  }

  if (computedTotal != null && input.lineSubtotal != null) {
    if (input.recordedTotal == null || input.recordedTotal < input.lineSubtotal) {
      return computedTotal
    }
    if (Math.abs(input.recordedTotal - computedTotal) > 2) {
      return computedTotal
    }
  }

  return input.summaryTotal ?? input.recordedTotal ?? computedTotal
}

export const resolveBuyerOrderTotals = (order: Record<string, unknown>): BuyerOrderTotals => {
  const summary =
    order.summary && typeof order.summary === "object"
      ? (order.summary as Record<string, unknown>)
      : null
  const summaryTotals = readSummaryTotalsBucket(order)
  const items = order.items
  const lineSubtotal = sumLineItems(items)

  const subtotal =
    lineSubtotal ??
    readOrderMoney(order.subtotal) ??
    readTotalsBucket(summary, TOTAL_FIELD_ALIASES.subtotal) ??
    readTotalsBucket(summaryTotals, TOTAL_FIELD_ALIASES.subtotal)

  const shippingTotal =
    readOrderMoney(order.shipping_total) ??
    readTotalsBucket(summary, TOTAL_FIELD_ALIASES.shippingTotal) ??
    readTotalsBucket(summaryTotals, TOTAL_FIELD_ALIASES.shippingTotal)

  const discountTotal =
    readOrderMoney(order.discount_total) ??
    readTotalsBucket(summary, TOTAL_FIELD_ALIASES.discountTotal) ??
    readTotalsBucket(summaryTotals, TOTAL_FIELD_ALIASES.discountTotal) ??
    0

  const taxTotal =
    readOrderMoney(order.tax_total) ??
    readTotalsBucket(summary, TOTAL_FIELD_ALIASES.taxTotal) ??
    readTotalsBucket(summaryTotals, TOTAL_FIELD_ALIASES.taxTotal) ??
    0

  const summaryTotal = readTotalsBucket(summaryTotals, TOTAL_FIELD_ALIASES.total)
  const recordedTotal =
    summaryTotal ??
    readOrderMoney(order.total) ??
    readPaymentCollectionTotal(order)

  const total = pickOrderTotal({
    lineSubtotal,
    subtotal,
    shippingTotal,
    discountTotal,
    taxTotal,
    summaryTotal,
    recordedTotal,
  })

  const currencyCode =
    typeof order.currency_code === "string" && order.currency_code.trim()
      ? order.currency_code
      : null
  const normalize = (value: number | null) =>
    value == null || !currencyCode ? value : normalizeMajor(value, currencyCode)

  return {
    subtotal: normalize(subtotal),
    shippingTotal: normalize(shippingTotal),
    discountTotal: normalize(discountTotal),
    taxTotal: normalize(taxTotal),
    total: normalize(total),
  }
}

export const resolveBuyerOrderTotalsForStorefront = (
  order: Record<string, unknown>
): BuyerOrderTotals => resolveBuyerOrderTotals(order)

const mergeOrderItems = (
  fallbackItems: unknown,
  graphItems: unknown
): unknown[] => {
  const fallback = Array.isArray(fallbackItems) ? fallbackItems : []
  const graph = Array.isArray(graphItems) ? graphItems : []
  if (!graph.length) return fallback
  if (!fallback.length) return graph

  const graphById = new Map(
    graph
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
      .map((item) => [String(item.id), item])
  )

  return fallback.map((item) => {
    if (!item || typeof item !== "object") return item
    const row = item as Record<string, unknown>
    const graphRow = graphById.get(String(row.id))
    if (!graphRow) return row
    return {
      ...row,
      ...graphRow,
      unit_price: readLineItemUnitPrice(graphRow) ?? readLineItemUnitPrice(row),
      subtotal:
        (() => {
          const graphSubtotal = readOrderMoney(graphRow.subtotal)
          const rowSubtotal = readOrderMoney(row.subtotal)
          if (graphSubtotal != null && graphSubtotal > 0) return graphSubtotal
          if (rowSubtotal != null && rowSubtotal > 0) return rowSubtotal
          return null
        })() ??
        readLineItemSubtotal({ ...row, ...graphRow }),
      total:
        (() => {
          const graphTotal = readOrderMoney(graphRow.total)
          const rowTotal = readOrderMoney(row.total)
          if (graphTotal != null && graphTotal > 0) return graphTotal
          if (rowTotal != null && rowTotal > 0) return rowTotal
          return null
        })(),
      quantity: readOrderMoney(graphRow.quantity) ?? readOrderMoney(row.quantity) ?? row.quantity,
    }
  })
}

export const enrichOrderWithSummaryTotals = async (
  req: { scope: { resolve: (key: string) => unknown } },
  orderId: string,
  fallback: Record<string, unknown>
) => {
  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as {
      graph: (input: never) => Promise<{ data?: Array<Record<string, unknown>> }>
    }
    const filters = { id: orderId }
    const { data } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "shipping_total",
        "summary.totals",
        "summary.subtotal",
        "summary.shipping_total",
        "summary.discount_total",
        "summary.tax_total",
        "summary.total",
        "items.id",
        "items.unit_price",
        "items.subtotal",
        "items.total",
        "items.quantity",
        "payment_collections.captured_amount",
        "payment_collections.raw_captured_amount",
        "payment_collections.amount",
      ],
      filters,
      options: { throwIfKeyNotFound: false },
    } as never)
    const graphOrder = data?.[0]
    if (!graphOrder) return fallback

    let summaryTotals = readSummaryTotalsBucket(graphOrder)
    if (!summaryTotals) {
      try {
        const { data: summaryRows } = await query.graph({
          entity: "order_summary",
          fields: ["totals", "order_id"],
          filters: { order_id: orderId },
        } as never)
        summaryTotals =
          summaryRows?.[0]?.totals && typeof summaryRows[0].totals === "object"
            ? (summaryRows[0].totals as Record<string, unknown>)
            : null
      } catch {
        summaryTotals = null
      }
    }

    const {
      subtotal: _subtotal,
      shipping_total: _shippingTotal,
      discount_total: _discountTotal,
      tax_total: _taxTotal,
      total: _total,
      items: _items,
      ...graphRest
    } = graphOrder

    return {
      ...fallback,
      ...graphRest,
      summary: summaryTotals ? { totals: summaryTotals } : graphOrder.summary ?? fallback.summary,
      shipping_total: readOrderMoney(fallback.shipping_total) ?? readOrderMoney(_shippingTotal),
      items: mergeOrderItems(fallback.items, graphOrder.items),
      shipping_address: fallback.shipping_address ?? graphOrder.shipping_address,
      billing_address: fallback.billing_address ?? graphOrder.billing_address,
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[buyer-order-totals] summary enrichment failed", {
        order_id: orderId,
        message: error instanceof Error ? error.message : String(error),
      })
    }
    return fallback
  }
}
