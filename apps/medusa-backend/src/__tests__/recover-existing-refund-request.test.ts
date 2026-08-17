import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { BUYER_REFUND_REQUESTS_MODULE } from "../modules/buyer-refund-requests"
import { FULFILLMENT_ORDERS_MODULE } from "../modules/fulfillment-orders"
import {
  RefundRecoveryScriptError,
  parseRecoverExistingRefundRequestArgs,
  runRecoverExistingRefundRequest,
} from "../scripts/recover-existing-refund-request"
import { PayPalClient } from "../modules/paypal/client"

jest.mock("../modules/paypal/client", () => ({
  ...jest.requireActual("../modules/paypal/client"),
  getConfiguredPayPalClient: jest.fn(() => ({})),
}))

const argv = [
  "--refund-request-id", "brr_1",
  "--order-id", "order_1",
  "--expected-payment-collection-id", "pay_col_1",
  "--expected-paypal-capture-id", "CAPTURE_1",
  "--expected-amount", "44",
  "--expected-currency", "usd",
  "--correlation-id", "corr_1",
]

const env = {
  NODE_ENV: "development",
  PAYPAL_REFUND_RECOVERY_ENABLED: "true",
  PAYPAL_ENVIRONMENT: "sandbox",
  PAYPAL_CLIENT_ID: "sandbox-client-id",
  PAYPAL_CLIENT_SECRET: "sandbox-client-secret",
}

const baseRequest = (overrides: Record<string, unknown> = {}) => ({
  id: "brr_1",
  order_id: "order_1",
  store_id: "store_1",
  customer_id: "cus_1",
  status: "auto_review",
  requested_amount: 44,
  currency_code: "usd",
  payment_provider_id: "pp_paypal_paypal",
  external_refund_id: null,
  attempt_count: 0,
  reason: "ordered_by_mistake",
  note: null,
  ...overrides,
})

const baseOrder = (overrides: Record<string, unknown> = {}) => ({
  id: "order_1",
  store_id: "store_1",
  metadata: { store_id: "store_1" },
  currency_code: "usd",
  payment_collections: [{
    id: "pay_col_1",
    status: "completed",
    currency_code: "usd",
    refunded_amount: 0,
    raw_refunded_amount: { value: "0", precision: 20 },
    payments: [{
      id: "pay_1",
      status: "captured",
      provider_id: "pp_paypal_paypal",
      amount: 44,
      raw_amount: { value: "44", precision: 20 },
      currency_code: "usd",
      captured_at: "now",
      data: {
        paypal_order_id: "ORDER_1",
        paypal_capture_id: "CAPTURE_1",
      },
      captures: [{
        id: "cap_1",
        status: "completed",
        amount: 44,
        raw_amount: { value: "44", precision: 20 },
        data: { paypal_capture_id: "CAPTURE_1" },
      }],
      refunds: [],
    }],
    payment_sessions: [{
      id: "payses_1",
      provider_id: "pp_paypal_paypal",
      data: { paypal_order_id: "ORDER_1" },
    }],
  }],
  ...overrides,
})

const createContainer = ({
  requests = [baseRequest()],
  order = baseOrder(),
  fulfillmentStatus = "waiting",
}: {
  requests?: Array<Record<string, unknown>>
  order?: Record<string, unknown>
  fulfillmentStatus?: string
} = {}) => {
  const refundService = {
    listBuyerRefundRequests: jest.fn(async () => requests),
    createBuyerRefundRequests: jest.fn(),
    updateBuyerRefundRequests: jest.fn(),
  }
  const query = { graph: jest.fn(async () => ({ data: [order] })) }
  const fulfillmentService = {
    listFulfillmentOrders: jest.fn(async () => [{ id: "fo_1", status: fulfillmentStatus }]),
  }
  const container = {
    resolve: jest.fn((key: string) => {
      if (key === BUYER_REFUND_REQUESTS_MODULE) return refundService
      if (key === ContainerRegistrationKeys.QUERY) return query
      if (key === FULFILLMENT_ORDERS_MODULE) return fulfillmentService
      throw new Error(`Unexpected dependency: ${key}`)
    }),
  }
  return { container, refundService, query, fulfillmentService }
}

describe("recover-existing-refund-request script", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("parses execute mode explicitly", () => {
    expect(parseRecoverExistingRefundRequestArgs([...argv, "--execute"])).toMatchObject({
      refundRequestId: "brr_1",
      orderId: "order_1",
      expectedPaymentCollectionId: "pay_col_1",
      expectedPayPalCaptureId: "CAPTURE_1",
      expectedAmount: 44,
      expectedCurrency: "usd",
      correlationId: "corr_1",
      execute: true,
    })
  })

  it("refuses production", async () => {
    await expect(runRecoverExistingRefundRequest({
      container: createContainer().container as never,
      argv,
      env: { ...env, NODE_ENV: "production" },
    })).rejects.toMatchObject({ code: "PRODUCTION_REFUSED" })
  })

  it("refuses missing enable flag", async () => {
    await expect(runRecoverExistingRefundRequest({
      container: createContainer().container as never,
      argv,
      env: { ...env, PAYPAL_REFUND_RECOVERY_ENABLED: "false" },
    })).rejects.toMatchObject({ code: "RECOVERY_NOT_ENABLED" })
  })

  it("runs dry-run only without --execute", async () => {
    const fixture = createContainer()
    const executeRefund = jest.fn()
    const result = await runRecoverExistingRefundRequest({
      container: fixture.container as never,
      argv,
      env,
      executeRefund: executeRefund as never,
    })
    expect(result).toMatchObject({
      mode: "dry_run",
      recovery_result: "dry_run_ready",
      provider_call_state: "not_called",
      refund_request_id: "brr_1",
      provider_idempotency_key: "brr_1",
    })
    expect(executeRefund).not.toHaveBeenCalled()
  })

  it("causes zero provider calls when preflight mismatches", async () => {
    const executeRefund = jest.fn()
    await expect(runRecoverExistingRefundRequest({
      container: createContainer({
        order: baseOrder({
          payment_collections: [{
            ...(baseOrder().payment_collections as Array<Record<string, unknown>>)[0],
            id: "pay_col_other",
          }],
        }),
      }).container as never,
      argv: [...argv, "--execute"],
      env,
      executeRefund: executeRefund as never,
    })).rejects.toMatchObject({ code: "PAYMENT_COLLECTION_ID_MISMATCH" })
    expect(executeRefund).not.toHaveBeenCalled()
  })

  it("causes zero provider calls when an external refund ID already exists", async () => {
    const executeRefund = jest.fn()
    await expect(runRecoverExistingRefundRequest({
      container: createContainer({
        requests: [baseRequest({ external_refund_id: "REFUND_1" })],
      }).container as never,
      argv: [...argv, "--execute"],
      env,
      executeRefund: executeRefund as never,
    })).rejects.toMatchObject({ code: "EXTERNAL_REFUND_ALREADY_EXISTS" })
    expect(executeRefund).not.toHaveBeenCalled()
  })

  it("causes zero provider calls when a completed refund already exists", async () => {
    const executeRefund = jest.fn()
    const collection = (baseOrder().payment_collections as Array<Record<string, unknown>>)[0]
    const payment = ((collection.payments as Array<Record<string, unknown>>)[0])
    await expect(runRecoverExistingRefundRequest({
      container: createContainer({
        order: baseOrder({
          payment_collections: [{
            ...collection,
            payments: [{
              ...payment,
              refunds: [{ id: "refund_1", amount: 44, status: "completed" }],
            }],
          }],
        }),
      }).container as never,
      argv: [...argv, "--execute"],
      env,
      executeRefund: executeRefund as never,
    })).rejects.toMatchObject({ code: "PAYMENT_ALREADY_FULLY_REFUNDED" })
    expect(executeRefund).not.toHaveBeenCalled()
  })

  it("passes the correct persistent request ID to executeApprovedRefund", async () => {
    const fixture = createContainer()
    const executeRefund = jest.fn(async () => baseRequest({
      status: "refunded",
      attempt_count: 1,
      external_refund_id: "REFUND_1",
      provider_status: "completed",
    }))
    fixture.query.graph.mockResolvedValueOnce({ data: [baseOrder()] })
    fixture.query.graph.mockResolvedValueOnce({ data: [baseOrder()] })
    fixture.query.graph.mockResolvedValueOnce({ data: [baseOrder({
      payment_collections: [{
        ...(baseOrder().payment_collections as Array<Record<string, unknown>>)[0],
        refunded_amount: 44,
        raw_refunded_amount: { value: "44", precision: 20 },
        payments: [{
          ...(((baseOrder().payment_collections as Array<Record<string, unknown>>)[0].payments as Array<Record<string, unknown>>)[0]),
          data: { paypal_refund_id: "REFUND_1", paypal_refund_status: "completed" },
          refunds: [{ id: "refund_1", amount: 44, status: "completed" }],
        }],
      }],
    })] })
    const result = await runRecoverExistingRefundRequest({
      container: fixture.container as never,
      argv: [...argv, "--execute"],
      env,
      executeRefund: executeRefund as never,
    })
    expect(executeRefund).toHaveBeenCalledWith(expect.objectContaining({
      refundRequestId: "brr_1",
      orderId: "order_1",
      storeId: "store_1",
      amount: 44,
    }))
    expect(result).toMatchObject({
      recovery_result: "completed",
      provider_idempotency_key: "brr_1",
      external_refund_id: "REFUND_1",
      medusa_refund_row_count: 1,
      refunded_amount: 44,
      remaining_refundable_amount: 0,
    })
  })

  it("does not insert a new refund request", async () => {
    const fixture = createContainer()
    await runRecoverExistingRefundRequest({
      container: fixture.container as never,
      argv,
      env,
      executeRefund: jest.fn() as never,
    })
    expect(fixture.refundService.createBuyerRefundRequests).not.toHaveBeenCalled()
  })

  it("uses the persistent request ID as provider idempotency", async () => {
    const result = await runRecoverExistingRefundRequest({
      container: createContainer().container as never,
      argv,
      env,
      executeRefund: jest.fn() as never,
    })
    expect(result.provider_idempotency_key).toBe("brr_1")
  })

  it("preserves the persistent request ID as the PayPal-Request-Id header", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: "token_1", expires_in: 300 }),
    } as Response).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "REFUND_1", status: "COMPLETED" }),
    } as Response)
    const client = new PayPalClient({
      clientId: "sandbox-client-id",
      clientSecret: "sandbox-client-secret",
      environment: "sandbox",
    })

    await client.refundCapture("CAPTURE_1", {
      amount: 44,
      currencyCode: "usd",
      requestId: "brr_1",
    })

    const headers = fetchMock.mock.calls[1][1]?.headers as Headers
    expect(headers.get("PayPal-Request-Id")).toBe("brr_1")
    fetchMock.mockRestore()
  })

  it("dry-run performs no mutation", async () => {
    const fixture = createContainer()
    await runRecoverExistingRefundRequest({
      container: fixture.container as never,
      argv,
      env,
      executeRefund: jest.fn() as never,
    })
    expect(fixture.refundService.createBuyerRefundRequests).not.toHaveBeenCalled()
    expect(fixture.refundService.updateBuyerRefundRequests).not.toHaveBeenCalled()
  })

  it("script result output does not contain secrets", async () => {
    const result = await runRecoverExistingRefundRequest({
      container: createContainer().container as never,
      argv,
      env,
      executeRefund: jest.fn() as never,
    })
    const output = JSON.stringify(result)
    expect(output).not.toContain(env.PAYPAL_CLIENT_SECRET)
    expect(output).not.toContain(env.PAYPAL_CLIENT_ID)
    expect(output).not.toContain("password")
  })

  it("marks non-completed execution outcomes as recovery required", async () => {
    const fixture = createContainer()
    const executeRefund = jest.fn(async () => baseRequest({
      status: "refund_pending",
      attempt_count: 1,
      provider_status: "pending",
    }))
    const result = await runRecoverExistingRefundRequest({
      container: fixture.container as never,
      argv: [...argv, "--execute"],
      env,
      executeRefund: executeRefund as never,
    })
    expect(result).toMatchObject({
      recovery_result: "recovery_required",
      provider_call_state: "indeterminate",
    })
  })
})
