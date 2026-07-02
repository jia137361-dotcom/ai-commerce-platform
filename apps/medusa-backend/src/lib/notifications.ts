import type StoreCoreModuleService from "../modules/store-core/service"

export type NotificationType =
  | "ai_complete"
  | "ai_failed"
  | "order_paid"
  | "fulfillment_failed"

export const createStoreNotification = async (
  storeCoreService: StoreCoreModuleService,
  input: {
    store_id: string
    type: NotificationType
    title: string
    body?: string | null
    metadata?: Record<string, unknown>
  }
) => {
  return storeCoreService.createStoreNotifications({
    store_id: input.store_id,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    read_at: null,
    metadata: input.metadata ?? {},
  })
}

export const notifyAiJobComplete = async (
  storeCoreService: StoreCoreModuleService,
  storeId: string,
  input: { jobId: string; productId: string; title: string }
) => {
  return createStoreNotification(storeCoreService, {
    store_id: storeId,
    type: "ai_complete",
    title: "AI product ready",
    body: `"${input.title}" is ready to edit.`,
    metadata: { job_id: input.jobId, product_id: input.productId },
  })
}

export const notifyAiJobFailed = async (
  storeCoreService: StoreCoreModuleService,
  storeId: string,
  input: { jobId: string; message: string }
) => {
  return createStoreNotification(storeCoreService, {
    store_id: storeId,
    type: "ai_failed",
    title: "AI generation failed",
    body: input.message,
    metadata: { job_id: input.jobId },
  })
}

export const notifyOrderPaid = async (
  storeCoreService: StoreCoreModuleService,
  storeId: string,
  input: { orderId: string; displayId?: number | null; email?: string | null }
) => {
  const label = input.displayId != null ? `#${input.displayId}` : input.orderId
  return createStoreNotification(storeCoreService, {
    store_id: storeId,
    type: "order_paid",
    title: "New order paid",
    body: `Order ${label}${input.email ? ` from ${input.email}` : ""}.`,
    metadata: { order_id: input.orderId, display_id: input.displayId ?? null },
  })
}

export const notifyFulfillmentFailed = async (
  storeCoreService: StoreCoreModuleService,
  storeId: string,
  input: { orderId: string; reason: string }
) => {
  return createStoreNotification(storeCoreService, {
    store_id: storeId,
    type: "fulfillment_failed",
    title: "Fulfillment push failed",
    body: input.reason,
    metadata: { order_id: input.orderId },
  })
}

export const parseNotificationsListQuery = (query: Record<string, unknown>) => {
  const limit = Math.min(Math.max(Number(query.limit ?? 20) || 20, 1), 100)
  const offset = Math.max(Number(query.offset ?? 0) || 0, 0)
  const unreadOnly = query.unread_only === "true" || query.unread_only === true
  return { limit, offset, unreadOnly }
}

export const normalizeNotification = (row: Record<string, unknown>) => ({
  id: row.id,
  store_id: row.store_id,
  type: row.type,
  title: row.title,
  body: row.body ?? null,
  read: row.read_at != null,
  read_at: row.read_at ?? null,
  metadata: row.metadata ?? {},
  created_at: row.created_at,
})
