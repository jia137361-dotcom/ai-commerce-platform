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
  const deliveredDone = ship?.status === "delivered" || Boolean(deliveredAt)

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

const readOrderNumeric = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const normalizeMoney = (value: number | null) => {
  if (value == null) return null
  return value > 999 ? value / 100 : value
}

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
    thumbnail: item.thumbnail ?? null,
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
