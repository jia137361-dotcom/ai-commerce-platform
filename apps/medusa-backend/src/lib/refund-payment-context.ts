import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { readOrderStoreId } from "./order-store-context"

export const REFUND_PAYMENT_CONTEXT_ERROR_CODES = [
  "PAYMENT_COLLECTION_NOT_FOUND",
  "PAYMENT_COLLECTION_AMBIGUOUS",
  "PAYMENT_NOT_FOUND",
  "PAYMENT_AMBIGUOUS",
  "PAYMENT_PROVIDER_MISMATCH",
  "PAYMENT_CAPTURE_NOT_FOUND",
  "PAYMENT_CAPTURE_AMBIGUOUS",
  "PAYPAL_CAPTURE_ID_MISSING",
  "PAYPAL_CAPTURE_ID_CONFLICT",
  "PAYMENT_CURRENCY_MISMATCH",
  "PAYMENT_AMOUNT_INVALID",
  "REFUND_AMOUNT_EXCEEDS_REMAINING",
  "PAYMENT_ALREADY_FULLY_REFUNDED",
] as const

export type RefundPaymentContextErrorCode =
  (typeof REFUND_PAYMENT_CONTEXT_ERROR_CODES)[number]

export class RefundPaymentContextError extends Error {
  code: RefundPaymentContextErrorCode

  constructor(code: RefundPaymentContextErrorCode, message: string) {
    super(message)
    this.name = "RefundPaymentContextError"
    this.code = code
  }
}

type QueryGraph = {
  graph: (input: Record<string, unknown>) => Promise<{ data?: RefundOrderRecord[] }>
}

type JsonRecord = Record<string, unknown>

type RefundRecord = JsonRecord & {
  id?: string
  amount?: unknown
  raw_amount?: unknown
  status?: unknown
}

type CaptureRecord = JsonRecord & {
  id?: string
  amount?: unknown
  raw_amount?: unknown
  status?: unknown
  data?: JsonRecord | null
  provider_transaction_id?: unknown
  provider_transaction_data?: JsonRecord | null
}

type PaymentSessionRecord = JsonRecord & {
  id?: string
  provider_id?: string | null
  status?: unknown
  data?: JsonRecord | null
  provider_transaction_id?: unknown
  provider_transaction_data?: JsonRecord | null
}

type PaymentRecord = JsonRecord & {
  id?: string
  provider_id?: string | null
  amount?: unknown
  raw_amount?: unknown
  currency_code?: string | null
  captured_at?: unknown
  canceled_at?: unknown
  status?: unknown
  data?: JsonRecord | null
  provider_transaction_data?: JsonRecord | null
  captures?: CaptureRecord[] | null
  refunds?: RefundRecord[] | null
  payment_session?: PaymentSessionRecord | null
}

type PaymentCollectionRecord = JsonRecord & {
  id?: string
  status?: string | null
  currency_code?: string | null
  amount?: unknown
  raw_amount?: unknown
  payments?: PaymentRecord[] | null
  payment_sessions?: PaymentSessionRecord[] | null
}

type RefundOrderRecord = JsonRecord & {
  id?: string
  metadata?: JsonRecord | null
  store_id?: string | null
  currency_code?: string | null
  payment_collections?: PaymentCollectionRecord[] | null
}

export type RefundPaymentContext = {
  order_id: string
  store_id: string | null
  currency_code: string
  payment_collection_id: string
  payment_collection_status: string | null
  payment_id: string
  provider_id: string
  payment_amount: number
  captured_amount: number
  refunded_amount: number
  remaining_refundable_amount: number
  payment_session_id: string | null
  provider_payment_id: string | null
  paypal_order_id: string | null
  paypal_capture_id: string | null
  capture_count: number
  refund_count: number
}

export type ResolveRefundPaymentContextInput = {
  container: MedusaContainer
  orderId: string
  requestedAmount?: unknown
  requestedCurrency?: string | null
  /**
   * Restrict resolution when a caller knows the provider. When omitted, the
   * single captured payment on the order is authoritative. This lets the
   * seller refund flow support both native Stripe and PayPal payments.
   */
  expectedProviderId?: string | null
}

const fail = (code: RefundPaymentContextErrorCode, message: string): never => {
  throw new RefundPaymentContextError(code, message)
}

const only = <T>(items: T[]) => {
  for (const item of items) return item
  return undefined
}

const normalizeString = (value: unknown) =>
  typeof value === "string" ? value.trim() : ""

const normalizeCurrency = (value: unknown) => normalizeString(value).toLowerCase()

const isObject = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value)

export function normalizeMinorUnitAmount(value: unknown): number {
  if (typeof value === "number") {
    if (
      !Number.isFinite(value) ||
      !Number.isSafeInteger(value)
    ) {
      fail("PAYMENT_AMOUNT_INVALID", "Amount must be a safe integer minor-unit value")
    }
    return value
  }

  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!/^-?\d+$/.test(trimmed)) {
      fail("PAYMENT_AMOUNT_INVALID", "Amount string must be an integer minor-unit value")
    }
    const parsed = Number(trimmed)
    if (!Number.isSafeInteger(parsed)) {
      fail("PAYMENT_AMOUNT_INVALID", "Amount string is outside the safe integer range")
    }
    return parsed
  }

  if (isObject(value)) {
    const keys = Object.keys(value)
    const supportedKeys = keys.every((key) =>
      ["value", "numeric", "precision"].includes(key)
    )
    const candidate = Object.prototype.hasOwnProperty.call(value, "value")
      ? value.value
      : value.numeric
    if (!supportedKeys || candidate === undefined) {
      fail("PAYMENT_AMOUNT_INVALID", "Amount object shape is not supported")
    }
    return normalizeMinorUnitAmount(candidate)
  }

  fail("PAYMENT_AMOUNT_INVALID", "Amount is not a supported minor-unit value")
}

const amountFrom = (record: { raw_amount?: unknown; amount?: unknown }) => {
  const raw = record.raw_amount
  if (raw !== undefined && raw !== null) return normalizeMinorUnitAmount(raw)
  return normalizeMinorUnitAmount(record.amount)
}

const captureAmount = (capture: CaptureRecord) => amountFrom(capture)

const paymentAmount = (payment: PaymentRecord) => amountFrom(payment)

const refundAmount = (refund: RefundRecord) => amountFrom(refund)

const isCompletedStatus = (value: unknown) => {
  const status = normalizeString(value).toLowerCase()
  return !status || ["captured", "completed", "succeeded", "success"].includes(status)
}

const isCanceledStatus = (value: unknown) => {
  const status = normalizeString(value).toLowerCase()
  return ["canceled", "cancelled", "failed", "voided"].includes(status)
}

const completedCaptures = (payment: PaymentRecord) =>
  (payment.captures ?? []).filter((capture) => {
    if (!isCompletedStatus(capture.status)) return false
    return captureAmount(capture) > 0
  })

const completedRefunds = (payment: PaymentRecord) =>
  (payment.refunds ?? []).filter((refund) => {
    const status = normalizeString(refund.status).toLowerCase()
    return !status || ["completed", "succeeded", "success"].includes(status)
  })

const hasCaptureEvidence = (payment: PaymentRecord) =>
  completedCaptures(payment).length > 0 ||
  (Boolean(payment.captured_at) && paymentAmount(payment) > 0)

const paymentMatchesProvider = (payment: PaymentRecord, expectedProviderId: string) =>
  normalizeString(payment.provider_id) === expectedProviderId

const sessionMatchesProvider = (session: PaymentSessionRecord, expectedProviderId: string) =>
  normalizeString(session.provider_id) === expectedProviderId

const collectionMatchesProvider = (
  collection: PaymentCollectionRecord,
  expectedProviderId: string
) =>
  (collection.payments ?? []).some((payment) =>
    paymentMatchesProvider(payment, expectedProviderId)
  ) ||
  (collection.payment_sessions ?? []).some((session) =>
    sessionMatchesProvider(session, expectedProviderId)
  )

const collectionHasPaymentEvidence = (collection: PaymentCollectionRecord) =>
  (collection.payments ?? []).some(hasCaptureEvidence)

const stringAt = (record: JsonRecord | null | undefined, path: string[]) => {
  let current: unknown = record
  for (const segment of path) {
    if (!isObject(current)) return null
    current = current[segment]
  }
  const value = normalizeString(current)
  return value || null
}

const collectStrings = (
  target: Set<string>,
  record: JsonRecord | null | undefined,
  paths: string[][]
) => {
  for (const path of paths) {
    const value = stringAt(record, path)
    if (value) target.add(value)
  }
}

const readPayPalIds = (
  payment: PaymentRecord,
  capture: CaptureRecord,
  session: PaymentSessionRecord | null
) => {
  const orderIds = new Set<string>()
  const captureIds = new Set<string>()
  const orderPaths = [
    ["paypal_order_id"],
    ["paypalOrderId"],
    ["order_id"],
    ["orderId"],
    ["paypal", "order_id"],
    ["paypal", "orderId"],
  ]
  const capturePaths = [
    ["paypal_capture_id"],
    ["paypalCaptureId"],
    ["capture_id"],
    ["captureId"],
    ["paypal", "capture_id"],
    ["paypal", "captureId"],
  ]

  collectStrings(orderIds, payment.data, orderPaths)
  collectStrings(captureIds, payment.data, capturePaths)
  collectStrings(orderIds, payment.provider_transaction_data, orderPaths)
  collectStrings(captureIds, payment.provider_transaction_data, capturePaths)
  collectStrings(orderIds, capture, orderPaths)
  collectStrings(captureIds, capture, capturePaths)
  collectStrings(orderIds, capture.data, orderPaths)
  collectStrings(captureIds, capture.data, capturePaths)
  collectStrings(orderIds, session?.data, orderPaths)
  collectStrings(captureIds, session?.data, capturePaths)
  collectStrings(orderIds, capture.provider_transaction_data, orderPaths)
  collectStrings(captureIds, capture.provider_transaction_data, capturePaths)
  collectStrings(orderIds, session?.provider_transaction_data, orderPaths)
  collectStrings(captureIds, session?.provider_transaction_data, capturePaths)

  const captureProviderTransactionId = normalizeString(capture.provider_transaction_id)
  if (captureProviderTransactionId) captureIds.add(captureProviderTransactionId)

  if (captureIds.size === 0) {
    fail("PAYPAL_CAPTURE_ID_MISSING", "PayPal capture ID is missing")
  }
  if (captureIds.size > 1) {
    fail("PAYPAL_CAPTURE_ID_CONFLICT", "Persisted PayPal capture IDs conflict")
  }

  return {
    paypal_order_id: only(Array.from(orderIds).sort()) ?? null,
    paypal_capture_id: only(Array.from(captureIds))!,
  }
}

const isPayPalProvider = (providerId: string) => providerId === "pp_paypal_paypal"

const readStripePaymentIntentId = (...records: Array<JsonRecord | null | undefined>) => {
  for (const record of records) {
    const direct = normalizeString(record?.id)
    if (direct.startsWith("pi_")) return direct
    const nested = record?.payment_intent
    if (typeof nested === "string" && nested.startsWith("pi_")) return nested
    if (isObject(nested) && normalizeString(nested.id).startsWith("pi_")) return normalizeString(nested.id)
  }
  return null
}

const validateCurrencyAgreement = (input: {
  orderCurrency: string
  collectionCurrency: string
  paymentCurrency: string
  requestedCurrency?: string | null
}) => {
  const requestedCurrency = normalizeCurrency(input.requestedCurrency)
  if (
    !input.orderCurrency ||
    !input.collectionCurrency ||
    !input.paymentCurrency ||
    input.orderCurrency !== input.collectionCurrency ||
    input.orderCurrency !== input.paymentCurrency ||
    (requestedCurrency && requestedCurrency !== input.orderCurrency)
  ) {
    fail("PAYMENT_CURRENCY_MISMATCH", "Order, collection, payment, and request currencies must agree")
  }
}

export async function resolveRefundPaymentContext({
  container,
  orderId,
  requestedAmount,
  requestedCurrency,
  expectedProviderId,
}: ResolveRefundPaymentContextInput): Promise<RefundPaymentContext> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as QueryGraph
  const { data } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "metadata",
      "store_id",
      "currency_code",
      "payment_collections.id",
      "payment_collections.status",
      "payment_collections.currency_code",
      "payment_collections.amount",
      "payment_collections.raw_amount",
      "payment_collections.payments.id",
      "payment_collections.payments.status",
      "payment_collections.payments.provider_id",
      "payment_collections.payments.amount",
      "payment_collections.payments.raw_amount",
      "payment_collections.payments.currency_code",
      "payment_collections.payments.captured_at",
      "payment_collections.payments.canceled_at",
      "payment_collections.payments.data",
      "payment_collections.payments.provider_transaction_data",
      "payment_collections.payments.captures.id",
      "payment_collections.payments.captures.status",
      "payment_collections.payments.captures.amount",
      "payment_collections.payments.captures.raw_amount",
      "payment_collections.payments.captures.data",
      "payment_collections.payments.captures.provider_transaction_id",
      "payment_collections.payments.captures.provider_transaction_data",
      "payment_collections.payments.refunds.id",
      "payment_collections.payments.refunds.status",
      "payment_collections.payments.refunds.amount",
      "payment_collections.payments.refunds.raw_amount",
      "payment_collections.payment_sessions.id",
      "payment_collections.payment_sessions.provider_id",
      "payment_collections.payment_sessions.status",
      "payment_collections.payment_sessions.data",
      "payment_collections.payment_sessions.provider_transaction_id",
      "payment_collections.payment_sessions.provider_transaction_data",
    ],
    filters: { id: orderId },
    options: { throwIfKeyNotFound: false },
  })

  const order = only(data ?? [])
  const collections = order?.payment_collections ?? []
  if (!order?.id || collections.length === 0) {
    fail("PAYMENT_COLLECTION_NOT_FOUND", "Payment collection is missing for this order")
  }

  const normalizedExpectedProviderId = normalizeString(expectedProviderId)
  const providerCollections = normalizedExpectedProviderId
    ? collections.filter((collection) => collectionMatchesProvider(collection, normalizedExpectedProviderId))
    : []
  const eligibleCollections = providerCollections.length
    ? providerCollections
    : collections.filter(collectionHasPaymentEvidence)

  if (eligibleCollections.length === 0) {
    fail("PAYMENT_COLLECTION_NOT_FOUND", "No eligible payment collection is available for this order")
  }
  if (eligibleCollections.length > 1) {
    fail("PAYMENT_COLLECTION_AMBIGUOUS", "More than one eligible payment collection is available")
  }

  const collection = only(eligibleCollections)!
  const payments = collection.payments ?? []
  const capturedPayments = payments.filter((payment) =>
    !payment.canceled_at &&
    !isCanceledStatus(payment.status) &&
    hasCaptureEvidence(payment)
  )
  const providerPayments = normalizedExpectedProviderId
    ? capturedPayments.filter((payment) => paymentMatchesProvider(payment, normalizedExpectedProviderId))
    : capturedPayments
  if (providerPayments.length === 0) {
    if (capturedPayments.length > 0) {
      fail("PAYMENT_PROVIDER_MISMATCH", "Captured payment provider does not match the expected provider")
    }
    fail("PAYMENT_NOT_FOUND", "No eligible captured payment is available")
  }
  if (providerPayments.length > 1) {
    fail("PAYMENT_AMBIGUOUS", "More than one eligible captured payment is available")
  }

  const payment = only(providerPayments)!
  if (!payment.id) fail("PAYMENT_NOT_FOUND", "Eligible payment is missing an ID")

  const persistedCaptures = completedCaptures(payment)
  // The native Stripe provider can persist `captured_at` on the payment
  // without creating a separate capture record. A refund still has an
  // authoritative payment amount in that case. PayPal remains stricter
  // because it needs the provider capture id for its refund API.
  const captures = persistedCaptures.length
    ? persistedCaptures
    : !isPayPalProvider(normalizeString(payment.provider_id)) && hasCaptureEvidence(payment)
      ? [{ amount: paymentAmount(payment), status: "completed" }]
      : []
  if (captures.length === 0) {
    fail("PAYMENT_CAPTURE_NOT_FOUND", "No authoritative completed capture is available")
  }
  if (captures.length > 1) {
    fail("PAYMENT_CAPTURE_AMBIGUOUS", "More than one authoritative completed capture is available")
  }

  const capture = only(captures)!
  const capturedAmount = captureAmount(capture)
  const currentPaymentAmount = paymentAmount(payment)
  if (capturedAmount <= 0 || currentPaymentAmount <= 0) {
    fail("PAYMENT_AMOUNT_INVALID", "Captured payment amount must be greater than zero")
  }

  const refunds = completedRefunds(payment)
  const currentRefundedAmount = refunds.reduce(
    (sum, refund) => sum + refundAmount(refund),
    0
  )
  if (currentRefundedAmount < 0 || currentRefundedAmount > capturedAmount) {
    fail("PAYMENT_AMOUNT_INVALID", "Refunded amount must be between zero and captured amount")
  }
  const remaining = capturedAmount - currentRefundedAmount
  if (remaining <= 0) {
    fail("PAYMENT_ALREADY_FULLY_REFUNDED", "Payment is already fully refunded")
  }

  const amount = requestedAmount === undefined || requestedAmount === null
    ? null
    : normalizeMinorUnitAmount(requestedAmount)
  if (amount !== null) {
    if (amount <= 0) {
      fail("PAYMENT_AMOUNT_INVALID", "Requested amount must be greater than zero")
    }
    if (amount > remaining) {
      fail("REFUND_AMOUNT_EXCEEDS_REMAINING", "Requested amount exceeds the remaining refundable balance")
    }
  }

  const orderCurrency = normalizeCurrency(order.currency_code)
  const collectionCurrency = normalizeCurrency(collection.currency_code)
  const paymentCurrency = normalizeCurrency(payment.currency_code)
  validateCurrencyAgreement({
    orderCurrency,
    collectionCurrency,
    paymentCurrency,
    requestedCurrency,
  })

  const providerId = normalizeString(payment.provider_id)
  if (!providerId) fail("PAYMENT_NOT_FOUND", "Eligible payment provider is missing")
  const session = only((collection.payment_sessions ?? []).filter((item) =>
    sessionMatchesProvider(item, providerId)
  )) ?? payment.payment_session ?? null
  const paypalIds = isPayPalProvider(providerId)
    ? readPayPalIds(payment, capture, session)
    : { paypal_order_id: null, paypal_capture_id: null }

  return {
    order_id: String(order.id),
    store_id: readOrderStoreId(order),
    currency_code: orderCurrency,
    payment_collection_id: String(collection.id),
    payment_collection_status: collection.status ?? null,
    payment_id: String(payment.id),
    provider_id: providerId,
    payment_amount: currentPaymentAmount,
    captured_amount: capturedAmount,
    refunded_amount: currentRefundedAmount,
    remaining_refundable_amount: remaining,
    payment_session_id: session?.id ? String(session.id) : null,
    provider_payment_id: isPayPalProvider(providerId)
      ? paypalIds.paypal_capture_id
      : readStripePaymentIntentId(payment.data, payment.provider_transaction_data, session?.data, session?.provider_transaction_data),
    paypal_order_id: paypalIds.paypal_order_id,
    paypal_capture_id: paypalIds.paypal_capture_id,
    capture_count: captures.length,
    refund_count: refunds.length,
  }
}
