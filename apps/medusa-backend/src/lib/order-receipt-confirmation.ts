export const RECEIPT_CONFIRMATION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

export const readDeliveredAt = (metadata: Record<string, unknown> | null | undefined) => {
  const value = metadata?.delivered_at ?? metadata?.mock_delivered_at
  if (typeof value !== "string") return null
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : null
}

export const isReceiptConfirmed = (
  order: { status?: unknown; metadata?: Record<string, unknown> | null }
) => order.status === "completed" || typeof order.metadata?.buyer_confirmed_received_at === "string"

export const shouldAutoConfirmReceipt = (
  order: { status?: unknown; metadata?: Record<string, unknown> | null },
  now = Date.now()
) => {
  if (isReceiptConfirmed(order)) return false
  const deliveredAt = readDeliveredAt(order.metadata)
  return deliveredAt !== null && now - deliveredAt >= RECEIPT_CONFIRMATION_WINDOW_MS
}
