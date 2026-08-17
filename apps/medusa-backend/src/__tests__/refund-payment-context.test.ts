import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  RefundPaymentContextError,
  resolveRefundPaymentContext,
} from "../lib/refund-payment-context"
import { runInspectRefundPaymentContext } from "../scripts/inspect-refund-payment-context"
import { executeApprovedRefund } from "../lib/refund-execution"
import { BUYER_REFUND_REQUESTS_MODULE } from "../modules/buyer-refund-requests"
import { FULFILLMENT_ORDERS_MODULE } from "../modules/fulfillment-orders"

const mockRefundWorkflowRun = jest.fn()

jest.mock("@medusajs/core-flows", () => ({
  refundPaymentWorkflow: () => ({ run: (...args: unknown[]) => mockRefundWorkflowRun(...args) }),
}))

const validPayment = (overrides: Record<string, unknown> = {}) => ({
  id: "pay_1",
  provider_id: "pp_paypal_paypal",
  status: "captured",
  amount: 44,
  raw_amount: { value: "44", precision: 20 },
  currency_code: "usd",
  captured_at: "2026-08-02T00:00:00.000Z",
  data: { paypal_order_id: "ORDER_1" },
  captures: [{
    id: "cap_row_1",
    status: "completed",
    amount: 44,
    data: { paypal_capture_id: "CAPTURE_1" },
  }],
  refunds: [],
  ...overrides,
})

const validCollection = (overrides: Record<string, unknown> = {}) => ({
  id: "pay_col_1",
  status: "completed",
  currency_code: "usd",
  payments: [validPayment()],
  payment_sessions: [{
    id: "payses_1",
    provider_id: "pp_paypal_paypal",
    status: "authorized",
    data: { paypal_order_id: "ORDER_1" },
  }],
  ...overrides,
})

const validOrder = (overrides: Record<string, unknown> = {}) => ({
  id: "order_1",
  store_id: "default_store",
  metadata: { store_id: "default_store" },
  currency_code: "usd",
  payment_collections: [validCollection()],
  ...overrides,
})

const createResolverContainer = (order: Record<string, unknown>) => {
  const query = { graph: jest.fn(async () => ({ data: [order] })) }
  const container = {
    resolve: jest.fn((key: string) => {
      if (key === ContainerRegistrationKeys.QUERY) return query
      throw new Error(`Unexpected dependency: ${key}`)
    }),
  }
  return { container, query }
}

const resolve = (order: Record<string, unknown>, overrides: Record<string, unknown> = {}) =>
  resolveRefundPaymentContext({
    container: createResolverContainer(order).container as never,
    orderId: "order_1",
    requestedAmount: 44,
    requestedCurrency: "usd",
    expectedProviderId: "pp_paypal_paypal",
    ...overrides,
  })

const expectCode = async (
  promise: Promise<unknown>,
  code: string
) => {
  await expect(promise).rejects.toMatchObject({ code })
}

describe("refund payment context resolver", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("resolves a valid single PayPal payment context", async () => {
    await expect(resolve(validOrder())).resolves.toEqual({
      order_id: "order_1",
      store_id: "default_store",
      currency_code: "usd",
      payment_collection_id: "pay_col_1",
      payment_collection_status: "completed",
      payment_id: "pay_1",
      provider_id: "pp_paypal_paypal",
      payment_amount: 44,
      captured_amount: 44,
      refunded_amount: 0,
      remaining_refundable_amount: 44,
      payment_session_id: "payses_1",
      paypal_order_id: "ORDER_1",
      paypal_capture_id: "CAPTURE_1",
      provider_payment_id: "CAPTURE_1",
      capture_count: 1,
      refund_count: 0,
    })
  })

  it("rejects no collection", async () => {
    await expectCode(resolve(validOrder({ payment_collections: [] })), "PAYMENT_COLLECTION_NOT_FOUND")
  })

  it("rejects multiple eligible collections", async () => {
    await expectCode(resolve(validOrder({
      payment_collections: [
        validCollection({ id: "pay_col_1" }),
        validCollection({ id: "pay_col_2", payments: [validPayment({ id: "pay_2" })] }),
      ],
    })), "PAYMENT_COLLECTION_AMBIGUOUS")
  })

  it("rejects no eligible payment", async () => {
    await expectCode(resolve(validOrder({
      payment_collections: [validCollection({ payments: [] })],
    })), "PAYMENT_NOT_FOUND")
  })

  it("rejects multiple eligible payments", async () => {
    await expectCode(resolve(validOrder({
      payment_collections: [validCollection({
        payments: [
          validPayment({ id: "pay_1" }),
          validPayment({ id: "pay_2", captures: [{ amount: 44, data: { paypal_capture_id: "CAPTURE_2" } }] }),
        ],
      })],
    })), "PAYMENT_AMBIGUOUS")
  })

  it("rejects the wrong provider", async () => {
    await expectCode(resolve(validOrder({
      payment_collections: [validCollection({
        payments: [validPayment({ provider_id: "pp_stripe_stripe" })],
        payment_sessions: [],
      })],
    })), "PAYMENT_PROVIDER_MISMATCH")
  })

  it("rejects no capture", async () => {
    await expectCode(resolve(validOrder({
      payment_collections: [validCollection({
        payments: [validPayment({ captures: [] })],
      })],
    })), "PAYMENT_CAPTURE_NOT_FOUND")
  })

  it("rejects multiple captures", async () => {
    await expectCode(resolve(validOrder({
      payment_collections: [validCollection({
        payments: [validPayment({
          captures: [
            { amount: 22, data: { paypal_capture_id: "CAPTURE_1" } },
            { amount: 22, data: { paypal_capture_id: "CAPTURE_2" } },
          ],
        })],
      })],
    })), "PAYMENT_CAPTURE_AMBIGUOUS")
  })

  it("rejects a missing PayPal capture ID", async () => {
    await expectCode(resolve(validOrder({
      payment_collections: [validCollection({
        payments: [validPayment({ captures: [{ amount: 44, data: {} }] })],
      })],
    })), "PAYPAL_CAPTURE_ID_MISSING")
  })

  it("rejects conflicting PayPal capture IDs", async () => {
    await expectCode(resolve(validOrder({
      payment_collections: [validCollection({
        payments: [validPayment({
          data: { paypal_capture_id: "CAPTURE_1" },
          captures: [{ amount: 44, data: { paypal_capture_id: "CAPTURE_2" } }],
        })],
      })],
    })), "PAYPAL_CAPTURE_ID_CONFLICT")
  })

  it("rejects currency mismatch", async () => {
    await expectCode(resolve(validOrder({ currency_code: "eur" })), "PAYMENT_CURRENCY_MISMATCH")
  })

  it("accepts a major-unit decimal string", async () => {
    await expect(resolve(validOrder(), { requestedAmount: "44.00" })).resolves.toMatchObject({
      captured_amount: 44,
    })
  })

  it("rejects requested amount above remaining", async () => {
    await expectCode(resolve(validOrder(), { requestedAmount: 44.01 }), "REFUND_AMOUNT_EXCEEDS_REMAINING")
  })

  it("rejects already fully refunded payment", async () => {
    await expectCode(resolve(validOrder({
      payment_collections: [validCollection({
        payments: [validPayment({ refunds: [{ amount: 44 }] })],
      })],
    })), "PAYMENT_ALREADY_FULLY_REFUNDED")
  })

  it("resolves a valid partially refunded payment", async () => {
    await expect(resolve(validOrder({
      payment_collections: [validCollection({
        payments: [validPayment({ refunds: [{ amount: 15 }] })],
      })],
    }), { requestedAmount: 29 })).resolves.toMatchObject({
      captured_amount: 44,
      refunded_amount: 15,
      remaining_refundable_amount: 29,
      refund_count: 1,
    })
  })

  it("is independent of array order", async () => {
    const inertPayment = validPayment({
      id: "pay_ignored",
      provider_id: "pp_stripe_stripe",
      captured_at: null,
      captures: [],
    })
    const first = await resolve(validOrder({
      payment_collections: [validCollection({
        payments: [inertPayment, validPayment()],
      })],
    }))
    const second = await resolve(validOrder({
      payment_collections: [validCollection({
        payments: [validPayment(), inertPayment],
      })],
    }))
    expect(first).toEqual(second)
  })
})

describe("refund payment context integration guards", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRefundWorkflowRun.mockResolvedValue({ result: {} })
  })

  it("causes zero provider calls when resolver invariants fail", async () => {
    let request: Record<string, unknown> = {
      id: "brr_1",
      order_id: "order_1",
      store_id: "default_store",
      status: "auto_review",
      decision_type: "auto_approve",
      reason: "ordered_by_mistake",
      attempt_count: 0,
    }
    const paymentModule = {
      retrievePayment: jest.fn(),
      updatePayment: jest.fn(),
    }
    const container = {
      resolve: jest.fn((key: string) => {
        if (key === Modules.LOCKING) return { execute: jest.fn(async (_key: string, job: () => Promise<unknown>) => job()) }
        if (key === BUYER_REFUND_REQUESTS_MODULE) return {
          listBuyerRefundRequests: jest.fn(async () => [request]),
          updateBuyerRefundRequests: jest.fn(async (input: Record<string, unknown>) => {
            request = { ...request, ...input }
            return request
          }),
        }
        if (key === ContainerRegistrationKeys.QUERY) return { graph: jest.fn(async () => ({ data: [validOrder({ payment_collections: [] })] })) }
        if (key === Modules.PAYMENT) return paymentModule
        if (key === FULFILLMENT_ORDERS_MODULE) return { listFulfillmentOrders: jest.fn(async () => []) }
        throw new Error(`Unexpected dependency: ${key}`)
      }),
    }

    await expect(executeApprovedRefund({
      container: container as never,
      refundRequestId: "brr_1",
      orderId: "order_1",
      storeId: "default_store",
      amount: 44,
    })).rejects.toMatchObject({ code: "PAYMENT_COLLECTION_NOT_FOUND" })
    expect(paymentModule.retrievePayment).not.toHaveBeenCalled()
    expect(paymentModule.updatePayment).not.toHaveBeenCalled()
    expect(mockRefundWorkflowRun).not.toHaveBeenCalled()
  })

  it("inspection script performs no mutation or provider invocation", async () => {
    const { container, query } = createResolverContainer(validOrder())
    const result = await runInspectRefundPaymentContext({
      container: container as never,
      argv: ["--order-id", "order_1", "--amount", "44", "--currency", "usd"],
      env: { NODE_ENV: "development" },
    })
    expect(result.payment_id).toBe("pay_1")
    expect(query.graph).toHaveBeenCalledTimes(1)
    expect(container.resolve).toHaveBeenCalledTimes(1)
  })

  it("inspection script refuses production", async () => {
    await expect(runInspectRefundPaymentContext({
      container: createResolverContainer(validOrder()).container as never,
      argv: ["--order-id", "order_1"],
      env: { NODE_ENV: "production" },
    })).rejects.toThrow("refuses NODE_ENV=production")
  })

  it("exposes resolver failures as typed errors", async () => {
    await expect(resolve(validOrder({ payment_collections: [] }))).rejects.toBeInstanceOf(RefundPaymentContextError)
  })
})
