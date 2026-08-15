export type NotificationType =
  | "ai_complete"
  | "ai_failed"
  | "order_paid"
  | "fulfillment_failed"
  | "refund_request"

export const parseNotificationsListQuery = (query: Record<string, unknown>) => {
  const limit = Math.min(Math.max(Number(query.limit ?? 20) || 20, 1), 100)
  const offset = Math.max(Number(query.offset ?? 0) || 0, 0)
  const unreadOnly =
    query.unread_only === "true" ||
    query.unread_only === "1" ||
    query.unread_only === true
  return { limit, offset, unreadOnly }
}

export const normalizeNotification = (row: Record<string, unknown>) => ({
  notification_id: row.id,
  store_id: row.store_id,
  type: row.type,
  title: row.title,
  body: row.body ?? null,
  read: Boolean(row.read_at),
  read_at: row.read_at ?? null,
  metadata: row.metadata ?? {},
  created_at: row.created_at,
})
