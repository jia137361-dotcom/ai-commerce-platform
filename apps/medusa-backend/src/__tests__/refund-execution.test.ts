import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { executeApprovedRefund } from "../lib/refund-execution"
import { BUYER_REFUND_REQUESTS_MODULE } from "../modules/buyer-refund-requests"
import { FULFILLMENT_ORDERS_MODULE } from "../modules/fulfillment-orders"

const mockRefundWorkflowRun = jest.fn()
const mockStripeApiRequest = jest.fn()

jest.mock("@medusajs/core-flows", () => ({
  refundPaymentWorkflow: () => ({ run: (...args: unknown[]) => mockRefundWorkflowRun(...args) }),
}))

jest.mock("../lib/stripe-client", () => ({
  stripeApiRequest: (...args: unknown[]) => mockStripeApiRequest(...args),
}))

const createFixture = ({
  requestStatus = "auto_review",
  decisionType = "auto_approve",
  productionStatus = "not_submitted",
  captured = 20,
  refunded = 0,
  providerRefundStatus = "COMPLETED",
  providerId = "pp_paypal_paypal",
  hasCaptureRecord = true,
}: {
  requestStatus?: string
  decisionType?: string
  productionStatus?: string
  captured?: number
  refunded?: number
  providerRefundStatus?: string
  providerId?: string
  hasCaptureRecord?: boolean
} = {}) => {
  let request: Record<string, unknown> = {
    id: "brr_1",
    order_id: "order_1",
    store_id: "default_store",
    status: requestStatus,
    decision_type: decisionType,
    reason: "ordered_by_mistake",
    attempt_count: 0,
  }
  const refundService = {
    listBuyerRefundRequests: jest.fn(async () => [request]),
    updateBuyerRefundRequests: jest.fn(async (input: Record<string, unknown>) => {
      request = { ...request, ...input }
      return request
    }),
  }
  const beforeRefunds = refunded > 0 ? [{ id: "refund_old", amount: refunded }] : []
  const order = {
    id: "order_1",
    currency_code: "usd",
    metadata: { store_id: "default_store" },
    payment_collections: [{
      id: "paycol_1",
      status: "completed",
      currency_code: "usd",
      payments: [{
        id: "pay_1",
        provider_id: providerId,
        amount: captured,
        currency_code: "usd",
        captured_at: "now",
        captures: hasCaptureRecord
          ? [{ id: "capture_1", amount: captured, data: { paypal_capture_id: "CAPTURE_1" } }]
          : [],
        refunds: beforeRefunds,
        data: providerId === "pp_paypal_paypal"
          ? { paypal_order_id: "ORDER_1", paypal_capture_id: "CAPTURE_1", currency: "usd" }
          : { id: "pi_1", currency: "usd" },
      }],
      payment_sessions: [{ id: "payses_1", provider_id: providerId, data: { paypal_order_id: "ORDER_1" } }],
    }],
    fulfillments: [],
  }
  const orderModule = { retrieveOrder: jest.fn(async () => order) }
  const query = { graph: jest.fn(async () => ({ data: [order] })) }
  const paymentModule = {
    updatePayment: jest.fn(async () => undefined),
    retrievePayment: jest.fn()
      .mockResolvedValueOnce({
        id: "pay_1",
        refunds: beforeRefunds,
        data: { paypal_capture_id: "CAPTURE_1" },
      })
      .mockResolvedValue({
        id: "pay_1",
        captures: hasCaptureRecord ? [{ id: "capture_1", amount: captured }] : [],
        refunds: [...beforeRefunds, { id: "refund_new", amount: 5 }],
        data: providerId === "pp_paypal_paypal"
          ? {
              paypal_refund_id: "PAYPAL_REFUND_1",
              paypal_refund_status: providerRefundStatus,
            }
          : {},
      }),
  }
  const locking = { execute: jest.fn(async (_key: string, job: () => Promise<unknown>) => job()) }
  const fulfillmentStatus = productionStatus === "not_submitted" ? "waiting" : productionStatus
  const fulfillment = {
    listFulfillmentOrders: jest.fn(async () => [{ id: "fo_1", status: fulfillmentStatus }]),
  }
  const container = {
    resolve: jest.fn((key: string) => {
      if (key === Modules.LOCKING) return locking
      if (key === BUYER_REFUND_REQUESTS_MODULE) return refundService
      if (key === Modules.ORDER) return orderModule
      if (key === ContainerRegistrationKeys.QUERY) return query
      if (key === Modules.PAYMENT) return paymentModule
      if (key === FULFILLMENT_ORDERS_MODULE) return fulfillment
      throw new Error(`Unexpected dependency: ${key}`)
    }),
  }
  return { container, refundService, paymentModule, locking, getRequest: () => request }
}

describe("approved refund execution", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRefundWorkflowRun.mockResolvedValue({ result: {} })
    mockStripeApiRequest.mockResolvedValue({ id: "re_1", status: "succeeded" })
  })

  it("executes a full provider refund once under the distributed lock", async () => {
    const fixture = createFixture()
    const result = await executeApprovedRefund({
      container: fixture.container as never,
      refundRequestId: "brr_1",
      orderId: "order_1",
      storeId: "default_store",
      amount: 20,
    })
    expect(fixture.locking.execute).toHaveBeenCalledWith("refund-request:brr_1", expect.any(Function), { timeout: 30 })
    expect(mockRefundWorkflowRun).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({ status: "refunded", external_refund_id: "PAYPAL_REFUND_1", external_transaction_id: "refund_new" })
  })

  it("marks a smaller refund as partial", async () => {
    const fixture = createFixture()
    const result = await executeApprovedRefund({
      container: fixture.container as never,
      refundRequestId: "brr_1",
      orderId: "order_1",
      storeId: "default_store",
      amount: 5,
    })
    expect(result.status).toBe("partially_refunded")
  })

  it("executes a Stripe refund using the order's captured Stripe payment", async () => {
    const fixture = createFixture({ providerId: "pp_stripe_stripe", hasCaptureRecord: false })
    const result = await executeApprovedRefund({
      container: fixture.container as never,
      refundRequestId: "brr_1",
      orderId: "order_1",
      storeId: "default_store",
      amount: 20,
    })

    expect(mockRefundWorkflowRun).not.toHaveBeenCalled()
    expect(mockStripeApiRequest).toHaveBeenCalledWith(
      "/refunds",
      expect.objectContaining({ params: { payment_intent: "pi_1", amount: 2000 } })
    )
    expect(result).toMatchObject({
      status: "refunded",
      payment_provider_id: "pp_stripe_stripe",
      external_refund_id: "re_1",
    })
  })

  it("does not describe a PayPal pending response as completed", async () => {
    const fixture = createFixture({ providerRefundStatus: "PENDING" })
    const result = await executeApprovedRefund({
      container: fixture.container as never,
      refundRequestId: "brr_1",
      orderId: "order_1",
      storeId: "default_store",
      amount: 5,
    })
    expect(result.status).toBe("refund_pending")
    expect(result.processed_at).toBeUndefined()
  })

  it("rejects an amount above the remaining captured balance", async () => {
    const fixture = createFixture({ captured: 20, refunded: 15 })
    await expect(executeApprovedRefund({
      container: fixture.container as never,
      refundRequestId: "brr_1",
      orderId: "order_1",
      storeId: "default_store",
      amount: 6,
    })).rejects.toThrow("remaining refundable")
    expect(mockRefundWorkflowRun).not.toHaveBeenCalled()
  })

  it("downgrades automatic approval when production starts before execution", async () => {
    const fixture = createFixture({ productionStatus: "in_production" })
    const result = await executeApprovedRefund({
      container: fixture.container as never,
      refundRequestId: "brr_1",
      orderId: "order_1",
      storeId: "default_store",
      amount: 20,
    })
    expect(result).toMatchObject({ status: "manual_review", latest_production_status: "in_production" })
    expect(mockRefundWorkflowRun).not.toHaveBeenCalled()
  })

  it("returns the original result for a duplicate completed approval", async () => {
    const fixture = createFixture({ requestStatus: "refunded" })
    const result = await executeApprovedRefund({
      container: fixture.container as never,
      refundRequestId: "brr_1",
      orderId: "order_1",
      storeId: "default_store",
      amount: 20,
    })
    expect(result.status).toBe("refunded")
    expect(mockRefundWorkflowRun).not.toHaveBeenCalled()
  })
})
