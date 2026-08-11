import {
  ORDER_META_PAYMENT_STATUS,
} from "./order-custom-metadata"
import type { CancellationContext, CancellationOrder } from "./order-cancellation"
import { readOrderStoreId } from "./order-store-context"

export type RefundRequestEligibility =
  | {
      allowed: true
      code: null
      message: null
      requestedAmount: number
      currencyCode: string
    }
  | {
      allowed: false
      code: string
      message: string
      requestedAmount: null
      currencyCode: string | null
    }

export type BuyerRefundRequestRecord = {
  id?: string
  order_id?: string
  display_id?: number | string | null
  customer_id?: string
  store_id?: string
  currency_code?: string
  requested_amount?: unknown
  eligible_amount?: unknown
  approved_amount?: unknown
  requested_items?: unknown
  reason?: string
  note?: string | null
  status?: string
  payment_provider_id?: string | null
  external_payment_id?: string | null
  external_refund_id?: string | null
  external_transaction_id?: string | null
  provider_status?: string | null
  provider_payload?: Record<string, unknown> | null
  reviewed_at?: string | Date | null
  processed_at?: string | Date | null
  failed_at?: string | Date | null
  failure_reason?: string | null
  policy_result?: string | null
  decision_type?: string | null
  decision_reason?: string | null
  reviewed_by?: string | null
  production_status_snapshot?: string | null
  latest_production_status?: string | null
  idempotency_key?: string | null
  attempt_count?: number | null
  last_provider_error_code?: string | null
  metadata?: Record<string, unknown> | null
  created_at?: string | Date
  updated_at?: string | Date
}

export const OPEN_REFUND_REQUEST_STATUSES = new Set([
  "pending",
  "requested",
  "auto_review",
  "manual_review",
  "awaiting_information",
  "approved",
  "processing",
  "refund_processing",
  "refund_pending",
])

const FINANCIALLY_RESERVED_REFUND_STATUSES = new Set([
  "approved",
  "processing",
  "refund_processing",
  "refund_pending",
  "partially_refunded",
  "refunded",
  "processed",
])

const normalizeStatus = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : ""

const readNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  if (value && typeof value === "object") {
    const candidate = value as { value?: unknown; numeric?: unknown }
    return readNumber(candidate.value ?? candidate.numeric)
  }
  return 0
}

const orderIsCancelled = (order: CancellationOrder) =>
  Boolean(order.canceled_at ?? order.cancelled_at) ||
  ["canceled", "cancelled"].includes(normalizeStatus(order.status))

const paymentStatus = (order: CancellationOrder) =>
  normalizeStatus(
    order.payment_status ?? order.metadata?.[ORDER_META_PAYMENT_STATUS]
  )

const readCurrency = (value: unknown) =>
  typeof value === "string" && value.trim()
    ? value.trim().toLowerCase()
    : null

type RefundableAmountResolution = {
  amount: number
  currencyCode: string
  source:
    | "payment_collection_captured_amount"
    | "completed_payment_collection_amount"
    | "captured_payment_amount"
    | "captured_record_amount"
    | "paid_payment_amount"
    | "order_total"
}

export function resolveRefundableAmount(
  order: CancellationOrder & {
    currency_code?: string | null
    total?: unknown
    summary?: { total?: unknown } | null
  }
): RefundableAmountResolution | null {
  const orderCurrency = readCurrency(order.currency_code)
  const orderTotal = readNumber(order.total) || readNumber(order.summary?.total)
  const capToOrderTotal = (amount: number) =>
    orderTotal > 0 ? Math.min(amount, orderTotal) : amount

  for (const collection of order.payment_collections ?? []) {
    const row = collection as Record<string, unknown>
    const collectionCurrency = readCurrency(row.currency_code) ?? orderCurrency
    const capturedAmount =
      readNumber(row.captured_amount) || readNumber(row.raw_captured_amount)
    if (capturedAmount > 0 && collectionCurrency) {
      return {
        amount: capToOrderTotal(capturedAmount),
        currencyCode: collectionCurrency,
        source: "payment_collection_captured_amount",
      }
    }
  }

  for (const collection of order.payment_collections ?? []) {
    const row = collection as Record<string, unknown>
    const collectionCurrency = readCurrency(row.currency_code) ?? orderCurrency
    const collectionStatus = normalizeStatus(row.status)
    const completed = Boolean(row.completed_at) || [
      "completed",
      "captured",
      "paid",
      "partially_captured",
    ].includes(collectionStatus)
    const amount = readNumber(row.amount)
    if (completed && amount > 0 && collectionCurrency) {
      return {
        amount: capToOrderTotal(amount),
        currencyCode: collectionCurrency,
        source: "completed_payment_collection_amount",
      }
    }
  }

  const capturedPaymentTotals = new Map<string, number>()
  for (const collection of order.payment_collections ?? []) {
    const row = collection as Record<string, unknown>
    const collectionCurrency = readCurrency(row.currency_code) ?? orderCurrency
    for (const payment of collection.payments ?? []) {
      if (!payment.captured_at) continue
      const currency = readCurrency(payment.currency_code) ?? collectionCurrency
      const amount = readNumber(payment.amount) || readNumber(payment.raw_amount)
      if (currency && amount > 0) {
        capturedPaymentTotals.set(
          currency,
          (capturedPaymentTotals.get(currency) ?? 0) + amount
        )
      }
    }
  }
  const capturedPaymentTotal = [...capturedPaymentTotals.entries()][0]
  if (capturedPaymentTotal) {
    return {
      amount: capToOrderTotal(capturedPaymentTotal[1]),
      currencyCode: capturedPaymentTotal[0],
      source: "captured_payment_amount",
    }
  }

  const captureTotals = new Map<string, number>()
  for (const collection of order.payment_collections ?? []) {
    const row = collection as Record<string, unknown>
    const collectionCurrency = readCurrency(row.currency_code) ?? orderCurrency
    for (const payment of collection.payments ?? []) {
      const currency = readCurrency(payment.currency_code) ?? collectionCurrency
      if (!currency) continue
      for (const capture of payment.captures ?? []) {
        const amount = readNumber(capture.amount) || readNumber(capture.raw_amount)
        if (amount > 0) {
          captureTotals.set(currency, (captureTotals.get(currency) ?? 0) + amount)
        }
      }
    }
  }
  const captureTotal = [...captureTotals.entries()][0]
  if (captureTotal) {
    return {
      amount: capToOrderTotal(captureTotal[1]),
      currencyCode: captureTotal[0],
      source: "captured_record_amount",
    }
  }

  const paidPaymentTotals = new Map<string, number>()
  for (const collection of order.payment_collections ?? []) {
    const row = collection as Record<string, unknown>
    const collectionCurrency = readCurrency(row.currency_code) ?? orderCurrency
    const collectionPaid = ["completed", "captured", "paid", "partially_captured"].includes(
      normalizeStatus(row.status)
    ) || Boolean(row.completed_at)
    for (const payment of collection.payments ?? []) {
      const paymentPaid = collectionPaid || ["completed", "captured", "paid", "partially_captured"].includes(
        normalizeStatus(payment.status)
      )
      if (!paymentPaid) continue
      const currency = readCurrency(payment.currency_code) ?? collectionCurrency
      const amount = readNumber(payment.amount) || readNumber(payment.raw_amount)
      if (currency && amount > 0) {
        paidPaymentTotals.set(currency, (paidPaymentTotals.get(currency) ?? 0) + amount)
      }
    }
  }
  const paidPaymentTotal = [...paidPaymentTotals.entries()][0]
  if (paidPaymentTotal) {
    return {
      amount: capToOrderTotal(paidPaymentTotal[1]),
      currencyCode: paidPaymentTotal[0],
      source: "paid_payment_amount",
    }
  }

  if (orderTotal > 0 && orderCurrency) {
    return {
      amount: orderTotal,
      currencyCode: orderCurrency,
      source: "order_total",
    }
  }
  return null
}

const paymentEvidence = (order: CancellationOrder) => {
  let capturedAmount = 0
  let capturedAt = false
  let completedAt = false
  let authorized = false
  let paidStatus = ["paid", "captured", "partially_paid", "partially_captured"].includes(
    paymentStatus(order)
  )

  for (const collection of order.payment_collections ?? []) {
    const row = collection as Record<string, unknown>
    capturedAmount +=
      readNumber(row.captured_amount) + readNumber(row.raw_captured_amount)
    completedAt ||= Boolean(row.completed_at)
    const collectionStatus = normalizeStatus(row.status)
    paidStatus ||= ["completed", "captured", "paid", "partially_captured"].includes(
      collectionStatus
    )
    authorized ||= collectionStatus === "authorized"

    for (const payment of collection.payments ?? []) {
      capturedAt ||= Boolean(payment.captured_at)
      const status = normalizeStatus(payment.status)
      paidStatus ||= ["captured", "paid", "completed", "partially_captured"].includes(status)
      authorized ||= status === "authorized"
      for (const capture of payment.captures ?? []) {
        capturedAmount += readNumber(capture.amount) + readNumber(capture.raw_amount)
        capturedAt ||= Boolean(capture.captured_at)
      }
    }
    for (const session of collection.payment_sessions ?? []) {
      const status = normalizeStatus(session.status)
      paidStatus ||= ["captured", "paid", "completed", "partially_captured"].includes(status)
      authorized ||= status === "authorized"
    }
  }

  return { capturedAmount, capturedAt, completedAt, authorized, paidStatus }
}

const denied = (
  code: string,
  message: string,
  currencyCode: string | null
): RefundRequestEligibility => ({
  allowed: false,
  code,
  message,
  requestedAmount: null,
  currencyCode,
})

export function evaluateRefundRequestEligibility(
  context: CancellationContext,
  input: {
    authCustomerId?: string | null
    requestedStoreId: string
    existingRequests: BuyerRefundRequestRecord[]
  }
): RefundRequestEligibility {
  const order = context.order as CancellationOrder & {
    currency_code?: string | null
    total?: unknown
    summary?: { total?: unknown } | null
  }
  const amountResolution = resolveRefundableAmount(order)
  const currencyCode = amountResolution?.currencyCode ?? readCurrency(order.currency_code)

  if (!order.id) return denied("ORDER_NOT_FOUND", "Order was not found.", currencyCode)
  if (!input.authCustomerId || order.customer_id !== input.authCustomerId) {
    return denied("ORDER_ACCESS_DENIED", "This order does not belong to the current customer.", currencyCode)
  }
  if (readOrderStoreId(order) !== input.requestedStoreId) {
    return denied("ORDER_WRONG_STORE", "This order does not belong to the current store.", currencyCode)
  }
  if (orderIsCancelled(order)) {
    return denied("ORDER_CANCELLED", "Cancelled orders cannot request a refund.", currencyCode)
  }

  const openRequest = input.existingRequests.find((request) =>
    OPEN_REFUND_REQUEST_STATUSES.has(normalizeStatus(request.status))
  )
  if (openRequest) {
    return denied(
      "ORDER_REFUND_REQUEST_EXISTS",
      "A refund request is already pending for this order.",
      currencyCode
    )
  }

  if (!context.paymentStateResolved) {
    return denied("ORDER_NOT_PAID", "Unable to confirm payment for this order.", currencyCode)
  }

  const evidence = paymentEvidence(order)
  const captured =
    evidence.capturedAmount > 0 ||
    evidence.capturedAt ||
    evidence.completedAt ||
    evidence.paidStatus

  if (!captured && evidence.authorized) {
    return denied(
      "ORDER_AUTHORIZED_NOT_CAPTURED",
      "This payment has not been captured yet. Cancel the order instead.",
      currencyCode
    )
  }
  if (!captured) {
    return denied("ORDER_NOT_PAID", "Only paid or captured orders can request a refund.", currencyCode)
  }

  if (!amountResolution) {
    return denied(
      "ORDER_REFUND_NOT_SUPPORTED",
      "Unable to determine a refundable amount for this order.",
      currencyCode
    )
  }

  const reservedAmount = input.existingRequests.reduce((sum, request) => {
    if (!FINANCIALLY_RESERVED_REFUND_STATUSES.has(normalizeStatus(request.status))) return sum
    const amount = readNumber(request.approved_amount) || readNumber(request.requested_amount)
    return sum + Math.max(0, amount)
  }, 0)
  const remainingAmount = Math.max(0, amountResolution.amount - reservedAmount)
  if (!(remainingAmount > 0)) {
    return denied(
      "ORDER_ALREADY_REFUNDED",
      "No refundable balance remains for this order.",
      amountResolution.currencyCode
    )
  }

  return {
    allowed: true,
    code: null,
    message: null,
    requestedAmount: remainingAmount,
    currencyCode: amountResolution.currencyCode,
  }
}

export const validateRefundRequestText = (input: {
  reason?: unknown
  note?: unknown
}) => {
  if (typeof input.reason !== "string" || !input.reason.trim()) {
    throw Object.assign(new Error("Refund reason is required."), {
      code: "REFUND_REQUEST_REASON_REQUIRED",
      status: 400,
    })
  }
  const reason = input.reason.trim()
  if (reason.length > 200 || /[<>]/.test(reason)) {
    throw Object.assign(new Error("Refund reason is invalid."), {
      code: "REFUND_REQUEST_REASON_INVALID",
      status: 400,
    })
  }
  if (input.note != null && typeof input.note !== "string") {
    throw Object.assign(new Error("Refund note must be a string."), {
      code: "REFUND_REQUEST_NOTE_INVALID",
      status: 400,
    })
  }
  const note = typeof input.note === "string" ? input.note.trim() : ""
  if (note.length > 1000 || /[<>]/.test(note)) {
    throw Object.assign(new Error("Refund note is invalid."), {
      code: "REFUND_REQUEST_NOTE_INVALID",
      status: 400,
    })
  }
  return { reason, note: note || null }
}

export const serializeBuyerRefundRequest = (request: BuyerRefundRequestRecord) => ({
  id: request.id ?? "",
  order_id: request.order_id ?? "",
  display_id: request.display_id ?? null,
  status: request.status ?? "pending",
  reason: request.reason ?? "",
  note: request.note ?? null,
  requested_amount: readNumber(request.requested_amount),
  eligible_amount:
    request.eligible_amount == null ? null : readNumber(request.eligible_amount),
  approved_amount:
    request.approved_amount == null ? null : readNumber(request.approved_amount),
  requested_items: request.requested_items ?? null,
  currency_code: request.currency_code ?? null,
  payment_provider_id: request.payment_provider_id ?? null,
  external_refund_id: request.external_refund_id ?? null,
  provider_status: request.provider_status ?? "not_connected",
  reviewed_at: request.reviewed_at ?? null,
  processed_at: request.processed_at ?? null,
  failed_at: request.failed_at ?? null,
  failure_reason: request.failure_reason ?? null,
  policy_result: request.policy_result ?? null,
  decision_type: request.decision_type ?? null,
  decision_reason: request.decision_reason ?? null,
  reviewed_by: request.reviewed_by ?? null,
  production_status_snapshot: request.production_status_snapshot ?? null,
  latest_production_status: request.latest_production_status ?? null,
  attempt_count: request.attempt_count ?? 0,
  last_provider_error_code: request.last_provider_error_code ?? null,
  created_at: request.created_at ?? null,
  updated_at: request.updated_at ?? null,
})
