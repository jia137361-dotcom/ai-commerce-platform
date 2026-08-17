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

const CONVERTIBLE_SESSION_STATUSES = new Set(["pending", "error", "canceled"])

export const classifyLegacyPaymentSession = (session: {
  status?: unknown
}): LegacyMoneyMigrationDecision => {
  const status = String(session.status ?? "").toLowerCase()
  if (CONVERTIBLE_SESSION_STATUSES.has(status)) return "convert"
  if (PROTECTED_SESSION_STATUSES.has(status)) return "protect"
  return "protect"
}

export const classifyLegacyPaymentCollection = (collection: {
  status?: unknown
  authorized_amount?: unknown
  captured_amount?: unknown
  refunded_amount?: unknown
}): LegacyMoneyMigrationDecision => {
  const status = String(collection.status ?? "").toLowerCase()
  if (!["pending", "not_paid", "canceled"].includes(status)) return "protect"
  if (
    positive(collection.authorized_amount) ||
    positive(collection.captured_amount) ||
    positive(collection.refunded_amount)
  ) {
    return "protect"
  }
  return "convert"
}

export const classifyLegacyCartTransaction = (input: {
  cart: Parameters<typeof classifyLegacyCart>[0]
  collections?: Array<Parameters<typeof classifyLegacyPaymentCollection>[0]>
  sessions?: Array<Parameters<typeof classifyLegacyPaymentSession>[0]>
  attempts?: Array<{ status?: unknown; completed_order_id?: unknown }>
  orderCount?: number
  paymentCount?: number
  captureCount?: number
  refundCount?: number
}): LegacyMoneyMigrationDecision => {
  if (classifyLegacyCart(input.cart) === "protect") return "protect"
  if (
    Number(input.orderCount ?? 0) > 0 ||
    Number(input.paymentCount ?? 0) > 0 ||
    Number(input.captureCount ?? 0) > 0 ||
    Number(input.refundCount ?? 0) > 0
  ) {
    return "protect"
  }
  if ((input.collections ?? []).some((row) => classifyLegacyPaymentCollection(row) === "protect")) {
    return "protect"
  }
  if ((input.sessions ?? []).some((row) => classifyLegacyPaymentSession(row) === "protect")) {
    return "protect"
  }
  const convertibleAttemptStatuses = new Set(["created", "expired", "payment_failed", "awaiting_payment"])
  if ((input.attempts ?? []).some((attempt) => {
    if (hasValue(attempt.completed_order_id)) return true
    return !convertibleAttemptStatuses.has(String(attempt.status ?? "").toLowerCase())
  })) {
    return "protect"
  }
  return "convert"
}

export type LegacyMoneyMigrationMode = "dry-run" | "apply"

export const parseLegacyMoneyMigrationMode = (argv: string[]): LegacyMoneyMigrationMode => {
  for (const argument of argv) {
    if (argument !== "--apply") {
      throw new Error(`Unknown migration argument: ${argument}`)
    }
  }
  return argv.includes("--apply") ? "apply" : "dry-run"
}
