export type LegacyMoneyMigrationDecision = "convert" | "protect"

const hasValue = (value: unknown) => value != null && value !== ""
const positive = (value: unknown) => hasValue(value) && Number(value) > 0

export const classifyLegacyCart = (cart: {
  completed_at?: unknown
  deleted_at?: unknown
}): LegacyMoneyMigrationDecision =>
  hasValue(cart.completed_at) || hasValue(cart.deleted_at) ? "protect" : "convert"

const PROTECTED_SESSION_STATUSES = new Set([
  "authorized",
  "captured",
  "pending_authorization",
  "requires_more",
  "requires_capture",
  "processing",
])

export const classifyLegacyPaymentSession = (session: {
  status?: unknown
}): LegacyMoneyMigrationDecision =>
  PROTECTED_SESSION_STATUSES.has(String(session.status ?? "").toLowerCase())
    ? "protect"
    : "convert"

export const classifyLegacyPaymentCollection = (collection: {
  status?: unknown
  authorized_amount?: unknown
  captured_amount?: unknown
  refunded_amount?: unknown
}): LegacyMoneyMigrationDecision => {
  if (String(collection.status ?? "").toLowerCase() === "completed") return "protect"
  if (
    positive(collection.authorized_amount) ||
    positive(collection.captured_amount) ||
    positive(collection.refunded_amount)
  ) {
    return "protect"
  }
  return "convert"
}
