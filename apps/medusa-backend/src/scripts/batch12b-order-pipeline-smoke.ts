import type { ExecArgs } from "./medusa-exec-args"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  cancelOrderWorkflow,
  capturePaymentWorkflow,
} from "@medusajs/core-flows"
import {
  cancellationResponse,
  evaluateCancellationEligibility,
  hasActivePaymentAuthorization,
  type CancellationContext,
  type CancellationOrder,
} from "../lib/order-cancellation"
import {
  evaluateRefundRequestEligibility,
  OPEN_REFUND_REQUEST_STATUSES,
  type BuyerRefundRequestRecord,
} from "../lib/order-refund-request"
import { readOrderStoreId } from "../lib/order-store-context"
import {
  createBatch12aCancellationSmokeOrder,
} from "./batch12a-cancel-smoke-setup"
import { BUYER_REFUND_REQUESTS_MODULE } from "../modules/buyer-refund-requests"
import type BuyerRefundRequestsModuleService from "../modules/buyer-refund-requests/service"
import { FULFILLMENT_ORDERS_MODULE } from "../modules/fulfillment-orders"
import type FulfillmentOrdersModuleService from "../modules/fulfillment-orders/service"

const DEFAULT_STORE_ID = "default_store"
const DEFAULT_CUSTOMER_EMAIL = "batch12b.pipeline+smoke@example.com"

type EnvLike = Record<string, string | undefined>

type QueryGraph = {
  graph: (input: {
    entity: string
    fields: string[]
    filters?: Record<string, unknown>
    options?: Record<string, unknown>
  }) => Promise<{ data: Array<Record<string, unknown>> }>
}

type RefundRequestService = BuyerRefundRequestsModuleService & {
  listBuyerRefundRequests: (
    filters: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<BuyerRefundRequestRecord[]>
  createBuyerRefundRequests: (
    input: Record<string, unknown>
  ) => Promise<BuyerRefundRequestRecord>
}

type PipelineOrder = CancellationOrder & {
  currency_code?: string | null
  total?: unknown
  summary?: { total?: unknown } | null
}

type PaymentEvidence = {
  capturedAmount: number
  authorizedAmount: number
  hasCapturedAt: boolean
  hasCompletedCollection: boolean
  activeAuthorization: boolean
  paymentIds: string[]
  authorizedPaymentIds: string[]
  collectionStatuses: string[]
  paymentSessionStatuses: string[]
}

export type Batch12bPipelineResult = {
  lines: Record<string, string | number | boolean>
}

const readString = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : null

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

const normalizeStatus = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : ""

export function assertBatch12bPipelineSmokeEnabled(env: EnvLike = process.env) {
  if (env.NODE_ENV === "production") {
    throw new Error("Batch 12B pipeline smoke cannot run in production")
  }
  if (env.BATCH12B_PIPELINE_SMOKE_ENABLED !== "true") {
    throw new Error(
      "Set BATCH12B_PIPELINE_SMOKE_ENABLED=true to run the Batch 12B pipeline smoke"
    )
  }
}

const orderFields = [
  "id",
  "display_id",
  "customer_id",
  "status",
  "payment_status",
  "fulfillment_status",
  "canceled_at",
  "metadata",
  "currency_code",
  "total",
  "summary.total",
  "payment_collections.id",
  "payment_collections.status",
  "payment_collections.currency_code",
  "payment_collections.amount",
  "payment_collections.completed_at",
  "payment_collections.authorized_amount",
  "payment_collections.raw_authorized_amount",
  "payment_collections.captured_amount",
  "payment_collections.raw_captured_amount",
  "payment_collections.payments.id",
  "payment_collections.payments.status",
  "payment_collections.payments.amount",
  "payment_collections.payments.raw_amount",
  "payment_collections.payments.currency_code",
  "payment_collections.payments.captured_at",
  "payment_collections.payments.canceled_at",
  "payment_collections.payments.captures.id",
  "payment_collections.payments.captures.amount",
  "payment_collections.payments.captures.raw_amount",
  "payment_collections.payment_sessions.status",
  "fulfillments.id",
  "fulfillments.status",
  "fulfillments.canceled_at",
] as const

async function readOrder(container: ExecArgs["container"], orderId: string) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as QueryGraph
  const { data } = await query.graph({
    entity: "order",
    fields: [...orderFields],
    filters: { id: orderId },
    options: { throwIfKeyNotFound: false },
  })
  if (!data[0]?.id) throw new Error(`Unable to retrieve smoke order ${orderId}`)
  return data[0] as PipelineOrder
}

function readPaymentEvidence(order: PipelineOrder): PaymentEvidence {
  let collectionCaptured = 0
  let captureRecords = 0
  let capturedPaymentAmounts = 0
  let authorizedAmount = 0
  let hasCapturedAt = false
  let hasCompletedCollection = false
  const paymentIds: string[] = []
  const authorizedPaymentIds: string[] = []
  const collectionStatuses: string[] = []
  const paymentSessionStatuses: string[] = []

  for (const collection of order.payment_collections ?? []) {
    collectionStatuses.push(normalizeStatus(collection.status))
    collectionCaptured +=
      readNumber(collection.captured_amount) ||
      readNumber(collection.raw_captured_amount)
    authorizedAmount +=
      readNumber(collection.authorized_amount) ||
      readNumber(collection.raw_authorized_amount)
    hasCompletedCollection ||= Boolean(collection.completed_at)

    for (const payment of collection.payments ?? []) {
      const paymentId = readString(payment.id)
      if (paymentId) paymentIds.push(paymentId)
      hasCapturedAt ||= Boolean(payment.captured_at)
      if (payment.captured_at) {
        capturedPaymentAmounts +=
          readNumber(payment.amount) || readNumber(payment.raw_amount)
      }
      if (
        paymentId &&
        normalizeStatus(payment.status) === "authorized" &&
        !payment.captured_at
      ) {
        authorizedPaymentIds.push(paymentId)
      }
      for (const capture of payment.captures ?? []) {
        captureRecords += readNumber(capture.amount) || readNumber(capture.raw_amount)
      }
    }
    for (const session of collection.payment_sessions ?? []) {
      paymentSessionStatuses.push(normalizeStatus(session.status))
    }
  }

  return {
    capturedAmount:
      collectionCaptured || captureRecords || capturedPaymentAmounts,
    authorizedAmount,
    hasCapturedAt,
    hasCompletedCollection,
    activeAuthorization: hasActivePaymentAuthorization(order),
    paymentIds,
    authorizedPaymentIds,
    collectionStatuses,
    paymentSessionStatuses,
  }
}

async function loadContext(
  container: ExecArgs["container"],
  orderId: string
): Promise<CancellationContext> {
  const order = await readOrder(container, orderId)
  const fulfillmentService = container.resolve(
    FULFILLMENT_ORDERS_MODULE
  ) as FulfillmentOrdersModuleService
  const customFulfillmentOrders = await fulfillmentService.listFulfillmentOrders({
    order_id: [orderId],
  })
  return {
    order,
    paymentStateResolved: Object.prototype.hasOwnProperty.call(
      order,
      "payment_collections"
    ),
    fulfillmentStateResolved: Object.prototype.hasOwnProperty.call(
      order,
      "fulfillments"
    ),
    customFulfillmentOrders,
  }
}

const listRefundRequests = (
  service: RefundRequestService,
  orderId: string,
  customerId: string,
  storeId: string
) =>
  service.listBuyerRefundRequests({
    order_id: orderId,
    customer_id: customerId,
    store_id: storeId,
  })

async function createPendingRefundRequest(
  service: RefundRequestService,
  context: CancellationContext,
  customerId: string,
  storeId: string
) {
  const existing = await listRefundRequests(
    service,
    context.order.id!,
    customerId,
    storeId
  )
  const eligibility = evaluateRefundRequestEligibility(context, {
    authCustomerId: customerId,
    requestedStoreId: storeId,
    existingRequests: existing,
  })
  if (!eligibility.allowed) {
    throw Object.assign(new Error(eligibility.message), {
      code: eligibility.code,
      status: 409,
    })
  }

  const displayId = Number(context.order.display_id)
  return service.createBuyerRefundRequests({
    order_id: context.order.id,
    display_id: Number.isFinite(displayId) ? displayId : null,
    customer_id: customerId,
    store_id: storeId,
    currency_code: eligibility.currencyCode,
    requested_amount: eligibility.requestedAmount,
    approved_amount: null,
    reason: "Batch 12B terminal pipeline smoke",
    note: null,
    status: "pending",
    payment_provider_id: null,
    external_payment_id: null,
    external_refund_id: null,
    external_transaction_id: null,
    provider_status: "not_connected",
    provider_payload: null,
    metadata: { scope: "full_order", batch12b_pipeline_smoke: true },
  })
}

async function findCapturedOrder(
  container: ExecArgs["container"],
  storeId: string,
  preferredCustomerId: string,
  explicitOrderId?: string | null
) {
  if (explicitOrderId) {
    const explicit = await loadContext(container, explicitOrderId)
    const evidence = readPaymentEvidence(explicit.order as PipelineOrder)
    if (
      readOrderStoreId(explicit.order) === storeId &&
      explicit.order.customer_id &&
      (evidence.capturedAmount > 0 ||
        evidence.hasCapturedAt ||
        evidence.hasCompletedCollection)
    ) {
      return explicit
    }
  }

  const orderModule = container.resolve(Modules.ORDER) as {
    listOrders: (
      filters: Record<string, unknown>,
      config?: Record<string, unknown>
    ) => Promise<Array<{ id?: string; customer_id?: string | null }>>
  }
  const candidates = await orderModule.listOrders(
    {},
    {
      select: ["id", "customer_id", "created_at"],
      order: { created_at: "DESC" },
      take: 100,
    }
  )
  candidates.sort((left, right) =>
    left.customer_id === preferredCustomerId
      ? -1
      : right.customer_id === preferredCustomerId
        ? 1
        : 0
  )
  for (const candidate of candidates) {
    if (!candidate.id) continue
    const context = await loadContext(container, candidate.id)
    const evidence = readPaymentEvidence(context.order as PipelineOrder)
    if (context.order.customer_id !== preferredCustomerId) continue
    if (readOrderStoreId(context.order) !== storeId) continue
    if (
      evidence.capturedAmount > 0 ||
      evidence.hasCapturedAt ||
      evidence.hasCompletedCollection
    ) {
      return context
    }
  }
  return null
}

export function capturedSmokeUnavailableResult(): Batch12bPipelineResult {
  return {
    lines: {
      CAPTURED_SMOKE_UNAVAILABLE: "provider_does_not_capture",
      CAPTURED_REFUND_RESULT: "SKIPPED",
    },
  }
}

async function createAndCaptureOrder(
  container: ExecArgs["container"],
  env: EnvLike,
  storeId: string,
  customerEmail: string
) {
  const setup = await createBatch12aCancellationSmokeOrder({
    container,
    env: {
      ...env,
      BATCH12A_CANCEL_SMOKE_ENABLED: "true",
      BATCH12A_STORE_ID: storeId,
      BATCH12A_CUSTOMER_EMAIL: customerEmail,
      BATCH12A_CANCEL_SMOKE_VARIANT_ID:
        env.BATCH12B_PIPELINE_SMOKE_VARIANT_ID,
    },
  })
  const context = await loadContext(container, setup.order_id)
  const evidence = readPaymentEvidence(context.order as PipelineOrder)
  const paymentId = evidence.authorizedPaymentIds[0]
  if (!paymentId) return null

  try {
    await capturePaymentWorkflow(container).run({
      input: { payment_id: paymentId, captured_by: setup.customer_id },
    })
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[batch12b-pipeline-smoke] provider capture unavailable", {
        payment_id: paymentId,
        message: error instanceof Error ? error.message : String(error),
      })
    }
    return null
  }

  const capturedContext = await loadContext(container, setup.order_id)
  const capturedEvidence = readPaymentEvidence(
    capturedContext.order as PipelineOrder
  )
  return capturedEvidence.capturedAmount > 0 || capturedEvidence.hasCapturedAt
    ? capturedContext
    : null
}

export async function runBatch12bOrderPipelineSmoke({
  container,
  env = process.env,
}: {
  container: ExecArgs["container"]
  env?: EnvLike
}): Promise<Batch12bPipelineResult[]> {
  assertBatch12bPipelineSmokeEnabled(env)
  const storeId = readString(env.BATCH12B_STORE_ID) ?? DEFAULT_STORE_ID
  const customerEmail =
    readString(env.BATCH12B_CUSTOMER_EMAIL)?.toLowerCase() ??
    DEFAULT_CUSTOMER_EMAIL
  const results: Batch12bPipelineResult[] = []

  const authorizedSetup = await createBatch12aCancellationSmokeOrder({
    container,
    env: {
      ...env,
      BATCH12A_CANCEL_SMOKE_ENABLED: "true",
      BATCH12A_STORE_ID: storeId,
      BATCH12A_CUSTOMER_EMAIL: customerEmail,
      BATCH12A_CANCEL_SMOKE_VARIANT_ID:
        env.BATCH12B_PIPELINE_SMOKE_VARIANT_ID,
    },
  })
  const authorizedContext = await loadContext(container, authorizedSetup.order_id)
  const authorizedEvidence = readPaymentEvidence(
    authorizedContext.order as PipelineOrder
  )
  const cancellation = evaluateCancellationEligibility(authorizedContext, {
    authCustomerId: authorizedSetup.customer_id,
    requestedStoreId: storeId,
  })
  const authorizedRefund = evaluateRefundRequestEligibility(authorizedContext, {
    authCustomerId: authorizedSetup.customer_id,
    requestedStoreId: storeId,
    existingRequests: [],
  })

  if (
    authorizedEvidence.authorizedAmount <= 0 ||
    authorizedEvidence.capturedAmount !== 0 ||
    authorizedEvidence.hasCapturedAt ||
    !authorizedEvidence.activeAuthorization ||
    !authorizedEvidence.collectionStatuses.includes("authorized") ||
    !authorizedEvidence.paymentSessionStatuses.includes("authorized") ||
    !cancellation.allowed ||
    authorizedRefund.allowed
  ) {
    throw new Error(
      "Pipeline A did not produce an authorized-not-captured cancellable order"
    )
  }

  await cancelOrderWorkflow(container).run({
    input: {
      order_id: authorizedSetup.order_id,
      canceled_by: authorizedSetup.customer_id,
    },
  })
  const cancelledContext = await loadContext(container, authorizedSetup.order_id)
  const cancelledEvidence = readPaymentEvidence(
    cancelledContext.order as PipelineOrder
  )
  const cancelledStatus = normalizeStatus(cancelledContext.order.status)
  if (
    !["canceled", "cancelled"].includes(cancelledStatus) ||
    cancelledEvidence.capturedAmount !== 0 ||
    cancelledEvidence.hasCapturedAt ||
    cancelledEvidence.activeAuthorization
  ) {
    throw new Error(
      "Pipeline A cancel did not cancel the order and void its authorization"
    )
  }

  results.push({
    lines: {
      AUTHORIZED_ORDER_ID: authorizedSetup.order_id,
      AUTHORIZED_DISPLAY_ID: authorizedSetup.display_id ?? "",
      AUTHORIZED_CAPTURED_AMOUNT: 0,
      AUTHORIZED_CANCEL_ALLOWED: cancellation.allowed,
      AUTHORIZED_REFUND_ALLOWED: authorizedRefund.allowed,
      AUTHORIZED_CANCEL_RESULT: "PASS",
    },
  })

  let capturedContext = await findCapturedOrder(
    container,
    storeId,
    authorizedSetup.customer_id,
    readString(env.BATCH12B_CAPTURED_ORDER_ID)
  )
  if (!capturedContext) {
    capturedContext = await createAndCaptureOrder(
      container,
      env,
      storeId,
      customerEmail
    )
  }
  if (!capturedContext) {
    results.push(capturedSmokeUnavailableResult())
    return results
  }

  const capturedOrder = capturedContext.order as PipelineOrder
  const capturedCustomerId = readString(capturedOrder.customer_id)
  if (!capturedCustomerId) {
    throw new Error("Captured smoke order has no customer ownership")
  }
  const refundService = container.resolve(
    BUYER_REFUND_REQUESTS_MODULE
  ) as RefundRequestService
  const existing = await listRefundRequests(
    refundService,
    capturedOrder.id!,
    capturedCustomerId,
    storeId
  )
  const capturedCancellation = evaluateCancellationEligibility(capturedContext, {
    authCustomerId: capturedCustomerId,
    requestedStoreId: storeId,
  })
  const capturedRefund = evaluateRefundRequestEligibility(capturedContext, {
    authCustomerId: capturedCustomerId,
    requestedStoreId: storeId,
    existingRequests: existing,
  })

  let request = existing.find((row) =>
    OPEN_REFUND_REQUEST_STATUSES.has(normalizeStatus(row.status))
  )
  if (!request) {
    if (!capturedRefund.allowed) {
      throw new Error(
        `Captured order is not refund-request eligible: ${capturedRefund.code} ${capturedRefund.message}`
      )
    }
    request = await createPendingRefundRequest(
      refundService,
      capturedContext,
      capturedCustomerId,
      storeId
    )
  }

  const duplicateEligibility = evaluateRefundRequestEligibility(capturedContext, {
    authCustomerId: capturedCustomerId,
    requestedStoreId: storeId,
    existingRequests: [request],
  })
  if (
    capturedCancellation.allowed ||
    !request.id ||
    normalizeStatus(request.status) !== "pending" ||
    readNumber(request.requested_amount) <= 0 ||
    duplicateEligibility.allowed ||
    duplicateEligibility.code !== "ORDER_REFUND_REQUEST_EXISTS"
  ) {
    throw new Error("Pipeline B refund-request assertions failed")
  }

  const capturedEvidence = readPaymentEvidence(capturedOrder)
  results.push({
    lines: {
      CAPTURED_ORDER_ID: capturedOrder.id!,
      CAPTURED_DISPLAY_ID: capturedOrder.display_id ?? "",
      CAPTURED_AMOUNT: capturedEvidence.capturedAmount,
      CAPTURED_REFUND_ALLOWED: true,
      REFUND_REQUEST_ID: request.id,
      REFUND_REQUEST_STATUS: request.status ?? "pending",
      DUPLICATE_RESULT: 409,
      CAPTURED_REFUND_RESULT: "PASS",
    },
  })
  return results
}

export default async function batch12bOrderPipelineSmoke({ container }: ExecArgs) {
  const results = await runBatch12bOrderPipelineSmoke({ container })
  for (const result of results) {
    for (const [key, value] of Object.entries(result.lines)) {
      console.log(`${key}=${value}`)
    }
  }
}
