import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { BUYER_REFUND_REQUESTS_MODULE } from "../modules/buyer-refund-requests"
import type BuyerRefundRequestsModuleService from "../modules/buyer-refund-requests/service"
import type { BuyerRefundRequestRecord } from "../lib/order-refund-request"

const DEFAULT_PROVIDER_ID = "pp_system_default"
const PAGE_SIZE = 100

type EnvLike = Record<string, string | undefined>

type QueryGraph = {
  graph: (input: {
    entity: string
    fields: string[]
    filters?: Record<string, unknown>
    options?: Record<string, unknown>
  }) => Promise<{ data: Array<Record<string, unknown>> }>
}

export type AuditOrder = {
  id?: string
  display_id?: string | number | null
  payment_collections?: Array<{
    id?: string
    status?: string | null
    currency_code?: string | null
    amount?: unknown
    completed_at?: string | Date | null
    authorized_amount?: unknown
    raw_authorized_amount?: unknown
    captured_amount?: unknown
    raw_captured_amount?: unknown
    payments?: Array<{
      id?: string
      status?: string | null
      provider_id?: string | null
      amount?: unknown
      raw_amount?: unknown
      currency_code?: string | null
      captured_at?: string | Date | null
      canceled_at?: string | Date | null
      captures?: Array<{ amount?: unknown; raw_amount?: unknown }> | null
    }> | null
    payment_sessions?: Array<{
      status?: string | null
      provider_id?: string | null
    }> | null
  }> | null
}

export type PaymentCapabilitySummary = {
  totalOrders: number
  authorizedNotCapturedOrders: number
  capturedOrders: number
  completedPaymentCollections: number
  paymentsWithCapturedAt: number
  canceledAuthorizations: number
  refundRequestsPending: number
  refundRequestsProcessed: number
  capturedSamples: Array<{
    orderId: string
    displayId: string | number | null
    capturedAmount: number
    currencyCode: string | null
  }>
  authorizedSamples: Array<{
    orderId: string
    displayId: string | number | null
    authorizedAmount: number
    currencyCode: string | null
  }>
  authorizedRefundRequestViolations: string[]
}

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

const readCurrency = (order: AuditOrder) => {
  for (const collection of order.payment_collections ?? []) {
    if (collection.currency_code) return collection.currency_code.toLowerCase()
    for (const payment of collection.payments ?? []) {
      if (payment.currency_code) return payment.currency_code.toLowerCase()
    }
  }
  return null
}

const readCapturedAmount = (order: AuditOrder) => {
  let collectionAmount = 0
  let captureAmount = 0
  let capturedPaymentAmount = 0
  for (const collection of order.payment_collections ?? []) {
    collectionAmount +=
      readNumber(collection.captured_amount) ||
      readNumber(collection.raw_captured_amount)
    for (const payment of collection.payments ?? []) {
      if (payment.captured_at) {
        capturedPaymentAmount +=
          readNumber(payment.amount) || readNumber(payment.raw_amount)
      }
      for (const capture of payment.captures ?? []) {
        captureAmount += readNumber(capture.amount) || readNumber(capture.raw_amount)
      }
    }
  }
  return collectionAmount || captureAmount || capturedPaymentAmount
}

const readAuthorizedAmount = (order: AuditOrder) =>
  (order.payment_collections ?? []).reduce(
    (sum, collection) =>
      sum +
      (readNumber(collection.authorized_amount) ||
        readNumber(collection.raw_authorized_amount)),
    0
  )

const hasCapturedEvidence = (order: AuditOrder) =>
  readCapturedAmount(order) > 0 ||
  (order.payment_collections ?? []).some(
    (collection) =>
      Boolean(collection.completed_at) ||
      (collection.payments ?? []).some((payment) => Boolean(payment.captured_at))
  )

const hasAuthorizationEvidence = (order: AuditOrder) =>
  readAuthorizedAmount(order) > 0 ||
  (order.payment_collections ?? []).some(
    (collection) =>
      normalizeStatus(collection.status) === "authorized" ||
      (collection.payments ?? []).some(
        (payment) => normalizeStatus(payment.status) === "authorized"
      ) ||
      (collection.payment_sessions ?? []).some(
        (session) => normalizeStatus(session.status) === "authorized"
      )
  )

export function assertPaymentCapabilityAuditEnabled(
  env: EnvLike = process.env
) {
  if (env.PAYMENT_CAPABILITY_AUDIT_ENABLED !== "true") {
    throw new Error(
      "Set PAYMENT_CAPABILITY_AUDIT_ENABLED=true to run the payment capability audit"
    )
  }
}

export function summarizePaymentCapabilityAudit(
  orders: AuditOrder[],
  refundRequests: BuyerRefundRequestRecord[]
): PaymentCapabilitySummary {
  const captured = orders.filter(hasCapturedEvidence)
  const authorized = orders.filter(
    (order) => hasAuthorizationEvidence(order) && !hasCapturedEvidence(order)
  )
  const authorizedIds = new Set(
    authorized.map((order) => order.id).filter((id): id is string => Boolean(id))
  )
  const openStatuses = new Set(["pending", "approved", "processing"])

  return {
    totalOrders: orders.length,
    authorizedNotCapturedOrders: authorized.length,
    capturedOrders: captured.length,
    completedPaymentCollections: orders.reduce(
      (sum, order) =>
        sum +
        (order.payment_collections ?? []).filter(
          (collection) =>
            Boolean(collection.completed_at) ||
            normalizeStatus(collection.status) === "completed"
        ).length,
      0
    ),
    paymentsWithCapturedAt: orders.reduce(
      (sum, order) =>
        sum +
        (order.payment_collections ?? []).reduce(
          (inner, collection) =>
            inner +
            (collection.payments ?? []).filter((payment) => payment.captured_at)
              .length,
          0
        ),
      0
    ),
    canceledAuthorizations: orders.reduce(
      (sum, order) =>
        sum +
        (order.payment_collections ?? []).reduce(
          (inner, collection) =>
            inner +
            (collection.payments ?? []).filter(
              (payment) =>
                Boolean(payment.canceled_at) && !Boolean(payment.captured_at)
            ).length,
          0
        ),
      0
    ),
    refundRequestsPending: refundRequests.filter(
      (request) => normalizeStatus(request.status) === "pending"
    ).length,
    refundRequestsProcessed: refundRequests.filter(
      (request) => normalizeStatus(request.status) === "processed"
    ).length,
    capturedSamples: captured.slice(0, 10).map((order) => ({
      orderId: order.id ?? "",
      displayId: order.display_id ?? null,
      capturedAmount: readCapturedAmount(order),
      currencyCode: readCurrency(order),
    })),
    authorizedSamples: authorized.slice(0, 10).map((order) => ({
      orderId: order.id ?? "",
      displayId: order.display_id ?? null,
      authorizedAmount: readAuthorizedAmount(order),
      currencyCode: readCurrency(order),
    })),
    authorizedRefundRequestViolations: refundRequests
      .filter(
        (request) =>
          Boolean(request.order_id) &&
          authorizedIds.has(request.order_id!) &&
          openStatuses.has(normalizeStatus(request.status))
      )
      .map((request) => request.id ?? request.order_id ?? "unknown"),
  }
}

export function formatPaymentCapabilityAudit(input: {
  providerIds: string[]
  defaultProviderId: string
  paymentModuleAuthorizeApiPresent: boolean
  paymentModuleCaptureApiPresent: boolean
  paymentModuleRefundApiPresent: boolean
  summary: PaymentCapabilitySummary
}) {
  const lines: string[] = [
    `PAYMENT_PROVIDER_IDS=${input.providerIds.join(",")}`,
    `PAYMENT_PROVIDER_COUNT=${input.providerIds.length}`,
    `DEFAULT_PROVIDER=${input.defaultProviderId}`,
    `SYSTEM_DEFAULT_PROVIDER_PRESENT=${input.providerIds.includes(input.defaultProviderId)}`,
    `PAYMENT_MODULE_AUTHORIZE_API_PRESENT=${input.paymentModuleAuthorizeApiPresent}`,
    `PAYMENT_MODULE_CAPTURE_API_PRESENT=${input.paymentModuleCaptureApiPresent}`,
    `PAYMENT_MODULE_REFUND_API_PRESENT=${input.paymentModuleRefundApiPresent}`,
    `TOTAL_ORDERS=${input.summary.totalOrders}`,
    `AUTHORIZED_NOT_CAPTURED_ORDERS=${input.summary.authorizedNotCapturedOrders}`,
    `CAPTURED_ORDERS=${input.summary.capturedOrders}`,
    `COMPLETED_PAYMENT_COLLECTIONS=${input.summary.completedPaymentCollections}`,
    `PAYMENTS_WITH_CAPTURED_AT=${input.summary.paymentsWithCapturedAt}`,
    `CANCELED_AUTHORIZATIONS=${input.summary.canceledAuthorizations}`,
    `REFUND_REQUESTS_PENDING=${input.summary.refundRequestsPending}`,
    `REFUND_REQUESTS_PROCESSED=${input.summary.refundRequestsProcessed}`,
    `CAPTURED_ORDER_SAMPLE_COUNT=${input.summary.capturedSamples.length}`,
    `CAPTURED_RUNTIME_AVAILABLE=${input.summary.capturedOrders > 0}`,
    `AUTHORIZE_RUNTIME_SUPPORTED=${input.summary.authorizedNotCapturedOrders > 0 || input.summary.capturedOrders > 0}`,
    `CAPTURE_RUNTIME_SUPPORTED=${input.summary.capturedOrders > 0}`,
    "REFUND_RUNTIME_SUPPORTED=unverified",
  ]

  for (const sample of input.summary.capturedSamples) {
    lines.push(
      `CAPTURED_ORDER_SAMPLE order_id=${sample.orderId} display_id=${sample.displayId ?? ""} captured_amount=${sample.capturedAmount} currency=${sample.currencyCode ?? ""}`
    )
  }
  for (const sample of input.summary.authorizedSamples) {
    lines.push(
      `AUTHORIZED_ORDER_SAMPLE order_id=${sample.orderId} display_id=${sample.displayId ?? ""} authorized_amount=${sample.authorizedAmount} captured_amount=0 currency=${sample.currencyCode ?? ""}`
    )
  }
  if (input.summary.authorizedRefundRequestViolations.length) {
    lines.push(
      `SAFETY_VIOLATION_AUTHORIZED_ORDER_HAS_REFUND_REQUEST=${input.summary.authorizedRefundRequestViolations.join(",")}`
    )
  } else {
    lines.push("REFUND_REQUEST_SAFETY_CHECK=PASS")
  }
  return lines
}

async function listAllOrders(container: ExecArgs["container"]) {
  const orderModule = container.resolve(Modules.ORDER) as {
    listOrders: (
      filters: Record<string, unknown>,
      config: Record<string, unknown>
    ) => Promise<Array<{ id?: string }>>
  }
  const ids: string[] = []
  for (let skip = 0; ; skip += PAGE_SIZE) {
    const page = await orderModule.listOrders(
      {},
      {
        select: ["id"],
        order: { created_at: "DESC" },
        take: PAGE_SIZE,
        skip,
      }
    )
    ids.push(...page.map((order) => order.id).filter((id): id is string => Boolean(id)))
    if (page.length < PAGE_SIZE) break
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY) as QueryGraph
  const orders: AuditOrder[] = []
  for (const id of ids) {
    const { data } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
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
        "payment_collections.payments.provider_id",
        "payment_collections.payments.amount",
        "payment_collections.payments.raw_amount",
        "payment_collections.payments.currency_code",
        "payment_collections.payments.captured_at",
        "payment_collections.payments.canceled_at",
        "payment_collections.payments.captures.amount",
        "payment_collections.payments.captures.raw_amount",
        "payment_collections.payment_sessions.status",
        "payment_collections.payment_sessions.provider_id",
      ],
      filters: { id },
      options: { throwIfKeyNotFound: false },
    })
    if (data[0]) orders.push(data[0] as AuditOrder)
  }
  return orders
}

async function listAllRefundRequests(container: ExecArgs["container"]) {
  const service = container.resolve(
    BUYER_REFUND_REQUESTS_MODULE
  ) as BuyerRefundRequestsModuleService & {
    listBuyerRefundRequests: (
      filters: Record<string, unknown>,
      config: Record<string, unknown>
    ) => Promise<BuyerRefundRequestRecord[]>
  }
  const rows: BuyerRefundRequestRecord[] = []
  for (let skip = 0; ; skip += PAGE_SIZE) {
    const page = await service.listBuyerRefundRequests(
      {},
      { take: PAGE_SIZE, skip, order: { created_at: "DESC" } }
    )
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
  }
  return rows
}

export async function runPaymentCapabilityAudit({
  container,
  env = process.env,
}: {
  container: ExecArgs["container"]
  env?: EnvLike
}) {
  assertPaymentCapabilityAuditEnabled(env)
  const paymentModule = container.resolve(Modules.PAYMENT) as {
    listPaymentProviders: (
      filters?: Record<string, unknown>,
      config?: Record<string, unknown>
    ) => Promise<Array<{ id: string; is_enabled?: boolean }>>
    authorizePaymentSession?: unknown
    capturePayment?: unknown
    refundPayment?: unknown
  }
  const providers = await paymentModule.listPaymentProviders(
    { is_enabled: true },
    { take: 100 }
  )
  const orders = await listAllOrders(container)
  const refundRequests = await listAllRefundRequests(container)
  const summary = summarizePaymentCapabilityAudit(orders, refundRequests)
  return formatPaymentCapabilityAudit({
    providerIds: providers.map((provider) => provider.id).sort(),
    defaultProviderId: DEFAULT_PROVIDER_ID,
    paymentModuleAuthorizeApiPresent:
      typeof paymentModule.authorizePaymentSession === "function",
    paymentModuleCaptureApiPresent:
      typeof paymentModule.capturePayment === "function",
    paymentModuleRefundApiPresent:
      typeof paymentModule.refundPayment === "function",
    summary,
  })
}

export default async function paymentCapabilityAudit({ container }: ExecArgs) {
  const lines = await runPaymentCapabilityAudit({ container })
  for (const line of lines) console.log(line)
}
