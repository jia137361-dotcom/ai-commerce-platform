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
  approved_amount?: unknown
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
  metadata?: Record<string, unknown> | null
  created_at?: string | Date
  updated_at?: string | Date
}

export const OPEN_REFUND_REQUEST_STATUSES = new Set([
  "pending",
  "approved",
  "processing",
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
  }
  const currencyCode =
    typeof order.currency_code === "string" && order.currency_code.trim()
      ? order.currency_code.trim().toLowerCase()
      : null

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

  const total = readNumber(order.total)
  const requestedAmount =
    evidence.capturedAmount > 0 && total > 0
      ? Math.min(evidence.capturedAmount, total)
      : evidence.capturedAmount > 0
        ? evidence.capturedAmount
        : total

  if (!currencyCode || requestedAmount <= 0) {
    return denied(
      "ORDER_REFUND_NOT_SUPPORTED",
      "Unable to determine a refundable amount for this order.",
      currencyCode
    )
  }

  return {
    allowed: true,
    code: null,
    message: null,
    requestedAmount,
    currencyCode,
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
  approved_amount:
    request.approved_amount == null ? null : readNumber(request.approved_amount),
  currency_code: request.currency_code ?? null,
  payment_provider_id: request.payment_provider_id ?? null,
  external_refund_id: request.external_refund_id ?? null,
  provider_status: request.provider_status ?? "not_connected",
  reviewed_at: request.reviewed_at ?? null,
  processed_at: request.processed_at ?? null,
  failed_at: request.failed_at ?? null,
  failure_reason: request.failure_reason ?? null,
  created_at: request.created_at ?? null,
  updated_at: request.updated_at ?? null,
})
