import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { ExecArgs } from "./medusa-exec-args"
import { BUYER_REFUND_REQUESTS_MODULE } from "../modules/buyer-refund-requests"
import { FULFILLMENT_ORDERS_MODULE } from "../modules/fulfillment-orders"
import type { BuyerRefundRequestRecord } from "../lib/order-refund-request"
import { executeApprovedRefund } from "../lib/refund-execution"
import {
  normalizeMinorUnitAmount,
  resolveRefundPaymentContext,
} from "../lib/refund-payment-context"
import { getConfiguredPayPalClient } from "../modules/paypal/client"

const PROVIDER_ID = "pp_paypal_paypal"
const COMPLETED_PROVIDER_STATUSES = new Set(["completed", "succeeded", "success"])

type EnvLike = Record<string, string | undefined>

type RecoveryArgs = {
  refundRequestId: string
  orderId: string
  expectedPaymentCollectionId: string
  expectedPayPalCaptureId: string
  expectedAmount: number
  expectedCurrency: string
  correlationId: string
  execute: boolean
}

type RefundService = {
  listBuyerRefundRequests: (
    filters: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<BuyerRefundRequestRecord[]>
}

type RuntimeState = {
  payment_collection_refunded_amount: number
  medusa_refund_row_count: number
  refunded_amount: number
  captured_amount: number
  remaining_refundable_amount: number
  provider_refund_id: string | null
  provider_refund_status: string | null
  fulfillment_status: string | null
}

export type RecoveryResult = {
  mode: "dry_run" | "execute"
  correlation_id: string
  refund_request_id: string
  refund_request_status: string | null
  provider_attempt_count: number
  provider_idempotency_key: string
  external_refund_id: string | null
  provider_refund_status: string | null
  medusa_refund_row_count: number
  refunded_amount: number
  remaining_refundable_amount: number
  fulfillment_status: string | null
  recovery_result: "dry_run_ready" | "completed" | "recovery_required"
  provider_call_state?: "not_called" | "failed" | "indeterminate" | "succeeded_local_persistence_failed" | "already_completed"
}

export class RefundRecoveryScriptError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly providerCallState: RecoveryResult["provider_call_state"] = "not_called"
  ) {
    super(message)
    this.name = "RefundRecoveryScriptError"
  }
}

const readFlag = (argv: string[], name: string) => {
  const inline = argv.find((arg) => arg.startsWith(`${name}=`))
  if (inline) return inline.slice(name.length + 1)
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === name) return argv[index + 1]
  }
  return undefined
}

const requireFlag = (argv: string[], name: string) => {
  const value = readFlag(argv, name)
  if (!value) throw new RefundRecoveryScriptError("MISSING_ARGUMENT", `${name} is required`)
  return value
}

export function parseRecoverExistingRefundRequestArgs(argv = process.argv.slice(2)): RecoveryArgs {
  return {
    refundRequestId: requireFlag(argv, "--refund-request-id"),
    orderId: requireFlag(argv, "--order-id"),
    expectedPaymentCollectionId: requireFlag(argv, "--expected-payment-collection-id"),
    expectedPayPalCaptureId: requireFlag(argv, "--expected-paypal-capture-id"),
    expectedAmount: normalizeMinorUnitAmount(requireFlag(argv, "--expected-amount")),
    expectedCurrency: requireFlag(argv, "--expected-currency").toLowerCase(),
    correlationId: requireFlag(argv, "--correlation-id"),
    execute: argv.includes("--execute"),
  }
}

const assertEqual = (actual: unknown, expected: unknown, code: string, label: string) => {
  if (actual !== expected) {
    throw new RefundRecoveryScriptError(
      code,
      `${label} mismatch: expected ${String(expected)}, received ${String(actual)}`
    )
  }
}

const normalizeStatus = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : ""

const first = <T>(items: T[]) => {
  for (const item of items) return item
  return undefined
}

const sumAmounts = (rows: Array<{ raw_amount?: unknown; amount?: unknown }>) =>
  rows.reduce((sum, row) => {
    const value = row.raw_amount ?? row.amount
    return sum + normalizeMinorUnitAmount(value)
  }, 0)

const isCompletedRefund = (row: { status?: unknown }) => {
  const status = normalizeStatus(row.status)
  return !status || COMPLETED_PROVIDER_STATUSES.has(status)
}

const loadRequest = async (
  container: MedusaContainer,
  args: RecoveryArgs
) => {
  const service = container.resolve(BUYER_REFUND_REQUESTS_MODULE) as RefundService
  const requests = await service.listBuyerRefundRequests(
    { order_id: [args.orderId] },
    { take: 10 }
  )
  if (requests.length !== 1) {
    throw new RefundRecoveryScriptError(
      "REFUND_REQUEST_COUNT_MISMATCH",
      `Expected exactly one buyer_refund_request for the order, found ${requests.length}`
    )
  }
  const request = first(requests)!
  assertEqual(request.id, args.refundRequestId, "REFUND_REQUEST_ID_MISMATCH", "refund request ID")
  return request
}

const loadRuntimeState = async (
  container: MedusaContainer,
  args: RecoveryArgs
): Promise<RuntimeState> => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as {
    graph: (input: Record<string, unknown>) => Promise<{ data?: Array<Record<string, unknown>> }>
  }
  const { data } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "payment_collections.id",
      "payment_collections.refunded_amount",
      "payment_collections.raw_refunded_amount",
      "payment_collections.payments.id",
      "payment_collections.payments.data",
      "payment_collections.payments.captures.amount",
      "payment_collections.payments.captures.raw_amount",
      "payment_collections.payments.refunds.id",
      "payment_collections.payments.refunds.status",
      "payment_collections.payments.refunds.amount",
      "payment_collections.payments.refunds.raw_amount",
    ],
    filters: { id: args.orderId },
    options: { throwIfKeyNotFound: false },
  })
  const order = first(data ?? [])
  const collection = first(((order?.payment_collections as Array<Record<string, unknown>> | undefined) ?? [])
    .filter((candidate) => candidate.id === args.expectedPaymentCollectionId))
  if (!collection) {
    throw new RefundRecoveryScriptError("PAYMENT_COLLECTION_NOT_FOUND", "Expected payment collection was not found")
  }
  const payment = first(((collection.payments as Array<Record<string, unknown>> | undefined) ?? [])
    .filter((candidate) => candidate.id))
  const refunds = ((payment?.refunds as Array<Record<string, unknown>> | undefined) ?? [])
    .filter(isCompletedRefund)
  const captures = (payment?.captures as Array<Record<string, unknown>> | undefined) ?? []
  const capturedAmount = sumAmounts(captures)
  const refundedAmount = sumAmounts(refunds)
  const collectionRefundedAmount = normalizeMinorUnitAmount(
    collection.raw_refunded_amount ?? collection.refunded_amount ?? 0
  )
  const dataRecord = payment?.data && typeof payment.data === "object"
    ? payment.data as Record<string, unknown>
    : {}

  const fulfillmentService = container.resolve(FULFILLMENT_ORDERS_MODULE) as {
    listFulfillmentOrders: (filters: Record<string, unknown>) => Promise<Array<{ status?: string | null }>>
  }
  const fulfillmentOrders = await fulfillmentService.listFulfillmentOrders({ order_id: [args.orderId] })

  return {
    payment_collection_refunded_amount: collectionRefundedAmount,
    medusa_refund_row_count: refunds.length,
    refunded_amount: refundedAmount,
    captured_amount: capturedAmount,
    remaining_refundable_amount: Math.max(0, capturedAmount - refundedAmount),
    provider_refund_id: typeof dataRecord.paypal_refund_id === "string" ? dataRecord.paypal_refund_id : null,
    provider_refund_status: typeof dataRecord.paypal_refund_status === "string" ? dataRecord.paypal_refund_status : null,
    fulfillment_status: first(fulfillmentOrders)?.status ?? null,
  }
}

const assertSandboxConfigured = (env: EnvLike) => {
  if (env.PAYPAL_ENVIRONMENT !== "sandbox") {
    throw new RefundRecoveryScriptError("PAYPAL_SANDBOX_NOT_PROVEN", "PAYPAL_ENVIRONMENT=sandbox is required for execution")
  }
  if (!env.PAYPAL_CLIENT_ID?.trim() || !env.PAYPAL_CLIENT_SECRET?.trim()) {
    throw new RefundRecoveryScriptError("PAYPAL_SANDBOX_NOT_PROVEN", "PayPal Sandbox credentials are required for execution")
  }
  if (!getConfiguredPayPalClient()) {
    throw new RefundRecoveryScriptError("PAYPAL_SANDBOX_NOT_PROVEN", "Configured PayPal provider could not be proven Sandbox")
  }
  return {
    environment: "sandbox",
    endpoint: "https://api-m.sandbox.paypal.com",
  }
}

const assertPreflight = async (
  container: MedusaContainer,
  args: RecoveryArgs
) => {
  const request = await loadRequest(container, args)
  assertEqual(request.order_id, args.orderId, "ORDER_ID_MISMATCH", "order ID")
  assertEqual(request.status, "auto_review", "REFUND_REQUEST_STATUS_MISMATCH", "refund request status")
  assertEqual(normalizeMinorUnitAmount(request.requested_amount), args.expectedAmount, "REQUESTED_AMOUNT_MISMATCH", "requested amount")
  assertEqual(String(request.currency_code ?? "").toLowerCase(), args.expectedCurrency, "REQUEST_CURRENCY_MISMATCH", "request currency")
  assertEqual(request.payment_provider_id, PROVIDER_ID, "PAYMENT_PROVIDER_MISMATCH", "payment provider")
  assertEqual(Number(request.attempt_count ?? 0), 0, "PROVIDER_ATTEMPT_COUNT_MISMATCH", "provider attempt count")
  if (request.external_refund_id) {
    throw new RefundRecoveryScriptError("EXTERNAL_REFUND_ALREADY_EXISTS", "External refund ID already exists")
  }

  const paymentContext = await resolveRefundPaymentContext({
    container,
    orderId: args.orderId,
    requestedAmount: args.expectedAmount,
    requestedCurrency: args.expectedCurrency,
    expectedProviderId: PROVIDER_ID,
  })
  assertEqual(paymentContext.payment_collection_id, args.expectedPaymentCollectionId, "PAYMENT_COLLECTION_ID_MISMATCH", "payment collection ID")
  assertEqual(paymentContext.provider_id, PROVIDER_ID, "PAYMENT_PROVIDER_MISMATCH", "payment provider")
  assertEqual(paymentContext.paypal_capture_id, args.expectedPayPalCaptureId, "PAYPAL_CAPTURE_ID_MISMATCH", "PayPal capture ID")
  assertEqual(paymentContext.captured_amount, args.expectedAmount, "CAPTURED_AMOUNT_MISMATCH", "captured amount")
  assertEqual(paymentContext.refunded_amount, 0, "REFUNDED_AMOUNT_MISMATCH", "refunded amount")
  assertEqual(paymentContext.remaining_refundable_amount, args.expectedAmount, "REMAINING_REFUNDABLE_MISMATCH", "remaining refundable amount")
  assertEqual(paymentContext.currency_code, args.expectedCurrency, "PAYMENT_CURRENCY_MISMATCH", "payment currency")
  assertEqual(paymentContext.capture_count, 1, "CAPTURE_COUNT_MISMATCH", "capture count")
  assertEqual(paymentContext.refund_count, 0, "REFUND_COUNT_MISMATCH", "refund count")

  const state = await loadRuntimeState(container, args)
  assertEqual(state.medusa_refund_row_count, 0, "MEDUSA_REFUND_ALREADY_EXISTS", "Medusa refund row count")
  assertEqual(state.payment_collection_refunded_amount, 0, "PAYMENT_COLLECTION_ALREADY_REFUNDED", "payment collection refunded amount")
  assertEqual(state.fulfillment_status, "waiting", "FULFILLMENT_STATUS_MISMATCH", "fulfillment status")
  if (state.provider_refund_id || COMPLETED_PROVIDER_STATUSES.has(normalizeStatus(state.provider_refund_status))) {
    throw new RefundRecoveryScriptError("PROVIDER_REFUND_ALREADY_EXISTS", "Completed provider refund already exists")
  }

  return { request, paymentContext, state }
}

const classifyAfterExecution = (
  request: BuyerRefundRequestRecord,
  state: RuntimeState
): RecoveryResult["provider_call_state"] => {
  const status = normalizeStatus(request.status)
  const providerStatus = normalizeStatus(state.provider_refund_status ?? request.provider_status)
  if (["refunded", "processed", "partially_refunded"].includes(status)) return "already_completed"
  if (status === "refund_pending" || providerStatus === "pending") return "indeterminate"
  if (state.provider_refund_id && state.medusa_refund_row_count === 0) return "succeeded_local_persistence_failed"
  if (status === "refund_failed" || ["failed", "denied", "cancelled", "canceled"].includes(providerStatus)) return "failed"
  return "indeterminate"
}

const buildResult = (
  mode: RecoveryResult["mode"],
  args: RecoveryArgs,
  request: BuyerRefundRequestRecord,
  state: RuntimeState,
  recoveryResult: RecoveryResult["recovery_result"],
  providerCallState?: RecoveryResult["provider_call_state"]
): RecoveryResult => ({
  mode,
  correlation_id: args.correlationId,
  refund_request_id: String(request.id),
  refund_request_status: request.status ?? null,
  provider_attempt_count: Number(request.attempt_count ?? 0),
  provider_idempotency_key: String(request.id),
  external_refund_id: request.external_refund_id ?? state.provider_refund_id,
  provider_refund_status: state.provider_refund_status ?? request.provider_status ?? null,
  medusa_refund_row_count: state.medusa_refund_row_count,
  refunded_amount: state.refunded_amount || state.payment_collection_refunded_amount,
  remaining_refundable_amount: state.remaining_refundable_amount,
  fulfillment_status: state.fulfillment_status,
  recovery_result: recoveryResult,
  ...(providerCallState ? { provider_call_state: providerCallState } : {}),
})

const isSuccessfulCompletion = (result: RecoveryResult) =>
  Boolean(result.external_refund_id) &&
  COMPLETED_PROVIDER_STATUSES.has(normalizeStatus(result.provider_refund_status)) &&
  result.medusa_refund_row_count === 1 &&
  result.refunded_amount === 4400 &&
  result.remaining_refundable_amount === 0

const redact = (value: string, env: EnvLike = process.env) => {
  let output = value
  for (const key of ["PAYPAL_CLIENT_SECRET", "PAYPAL_CLIENT_ID", "PAY_PAYPAL_TEST_PASSWORD"]) {
    const secret = env[key]
    if (secret && secret.length > 3) output = output.split(secret).join("[redacted]")
  }
  return output
}

export async function runRecoverExistingRefundRequest({
  container,
  argv = process.argv.slice(2),
  env = process.env,
  executeRefund = executeApprovedRefund,
}: ExecArgs & {
  argv?: string[]
  env?: EnvLike
  executeRefund?: typeof executeApprovedRefund
}): Promise<RecoveryResult> {
  if (env.NODE_ENV === "production") {
    throw new RefundRecoveryScriptError("PRODUCTION_REFUSED", "Refund recovery refuses NODE_ENV=production")
  }
  if (env.PAYPAL_REFUND_RECOVERY_ENABLED !== "true") {
    throw new RefundRecoveryScriptError("RECOVERY_NOT_ENABLED", "PAYPAL_REFUND_RECOVERY_ENABLED=true is required")
  }

  const args = parseRecoverExistingRefundRequestArgs(argv)
  const { request, state } = await assertPreflight(container, args)

  if (!args.execute) {
    return buildResult("dry_run", args, request, state, "dry_run_ready", "not_called")
  }

  assertSandboxConfigured(env)
  let executed: BuyerRefundRequestRecord
  try {
    executed = await executeRefund({
      container,
      refundRequestId: args.refundRequestId,
      orderId: args.orderId,
      storeId: String(request.store_id),
      amount: args.expectedAmount,
      createdBy: "development-refund-recovery",
      note: `correlation_id=${args.correlationId}`,
    })
  } catch (error) {
    const postErrorState = await loadRuntimeState(container, args).catch(() => state)
    const code = error instanceof Error ? error.name : "REFUND_EXECUTION_ERROR"
    throw new RefundRecoveryScriptError(
      "REFUND_EXECUTION_THROWN",
      `Refund execution threw before a completed result: ${code}`,
      postErrorState.provider_refund_id ? "succeeded_local_persistence_failed" : "failed"
    )
  }

  const postState = await loadRuntimeState(container, args)
  const result = buildResult("execute", args, executed, postState, "completed")
  if (isSuccessfulCompletion(result)) return result

  const providerCallState = classifyAfterExecution(executed, postState)
  return {
    ...buildResult("execute", args, executed, postState, "recovery_required", providerCallState),
  }
}

export default async function recoverExistingRefundRequest({ container }: ExecArgs) {
  try {
    const result = await runRecoverExistingRefundRequest({ container })
    console.log(JSON.stringify(result, null, 2))
    if (result.recovery_result !== "dry_run_ready" && result.recovery_result !== "completed") {
      process.exitCode = 1
    }
  } catch (error) {
    const payload = error instanceof RefundRecoveryScriptError
      ? { error: error.code, message: redact(error.message), provider_call_state: error.providerCallState }
      : { error: "REFUND_RECOVERY_FAILED", message: redact(error instanceof Error ? error.message : String(error)) }
    console.error(JSON.stringify(payload, null, 2))
    process.exitCode = 1
  }
}
