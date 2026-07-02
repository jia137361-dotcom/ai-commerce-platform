import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { FULFILLMENT_ORDERS_MODULE } from "../modules/fulfillment-orders"
import { POST as cancelOrder } from "../api/store/customers/me/orders/[id]/cancel/route"

const mockCancelRun = jest.fn()

jest.mock("@medusajs/core-flows", () => ({
  cancelOrderWorkflow: jest.fn(() => ({ run: mockCancelRun })),
}))

type MockRes = MedusaResponse & {
  statusCode?: number
  body?: unknown
  status: jest.Mock
  json: jest.Mock
}

const createRes = (): MockRes => {
  const res: Partial<MockRes> = {}
  res.status = jest.fn((code: number) => {
    res.statusCode = code
    return res
  }) as unknown as MockRes["status"]
  res.json = jest.fn((body: unknown) => {
    res.body = body
    return res
  }) as unknown as MockRes["json"]
  return res as MockRes
}

const baseOrder = {
  id: "order_1",
  display_id: 101,
  customer_id: "cus_a",
  email: "same@example.com",
  status: "pending",
  metadata: { store_id: "default_store", payment_status: "pending", mc_fulfillment_status: "none" },
  payment_collections: [
    {
      id: "paycol_1",
      status: "pending",
      captured_amount: 0,
      payments: [],
      payment_sessions: [{ status: "pending" }],
    },
  ],
  fulfillments: [],
}

const cancelledOrder = {
  ...baseOrder,
  status: "canceled",
  canceled_at: "2026-06-18T08:00:00.000Z",
}

const authorizedOrder = {
  ...baseOrder,
  metadata: { ...baseOrder.metadata, payment_status: "authorized" },
  payment_collections: [
    {
      id: "paycol_1",
      status: "authorized",
      authorized_amount: 2125,
      captured_amount: 0,
      completed_at: null,
      payments: [{ id: "pay_1", status: "authorized", captured_at: null, captures: [] }],
      payment_sessions: [{ status: "authorized" }],
    },
  ],
}

const cancelledAuthorizedOrder = {
  ...cancelledOrder,
  metadata: { ...cancelledOrder.metadata, payment_status: "authorized" },
  payment_collections: [
    {
      id: "paycol_1",
      status: "canceled",
      authorized_amount: 0,
      captured_amount: 0,
      completed_at: null,
      payments: [{ id: "pay_1", status: "canceled", captured_at: null, captures: [] }],
      payment_sessions: [{ status: "canceled" }],
    },
  ],
}

const createReq = ({
  authCustomerId = "cus_a",
  headers = {
    "x-publishable-api-key": "pk_test",
    "x-store-id": "default_store",
  },
  body = {},
  graphOrders = [baseOrder],
  customFulfillmentOrders = [],
  retrieveOrder = cancelledOrder,
  workflowError,
}: {
  authCustomerId?: string | null
  headers?: Record<string, string>
  body?: Record<string, unknown>
  graphOrders?: Record<string, unknown>[]
  customFulfillmentOrders?: Record<string, unknown>[]
  retrieveOrder?: Record<string, unknown>
  workflowError?: Error
} = {}) => {
  mockCancelRun.mockImplementation(async () => {
    if (workflowError) throw workflowError
    return { result: undefined }
  })
  const orderModule = {
    retrieveOrder: jest.fn(async () => retrieveOrder),
  }
  const queryGraph = {
    graph: jest.fn(async () => ({ data: graphOrders })),
  }
  const fulfillmentOrders = {
    listFulfillmentOrders: jest.fn(async () => customFulfillmentOrders),
  }
  const req = {
    params: { id: "order_1" },
    headers,
    body,
    auth_context: authCustomerId ? { actor_id: authCustomerId } : undefined,
    scope: {
      resolve: jest.fn((key: string) => {
        if (key === Modules.ORDER) return orderModule
        if (key === ContainerRegistrationKeys.QUERY) return queryGraph
        if (key === FULFILLMENT_ORDERS_MODULE) return fulfillmentOrders
        throw new Error(`Unexpected dependency: ${key}`)
      }),
    },
  } as unknown as MedusaRequest

  return { req, orderModule, queryGraph, fulfillmentOrders }
}

describe("POST /store/customers/me/orders/:id/cancel", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("requires authenticated customer session", async () => {
    const { req } = createReq({ authCustomerId: null })
    const res = createRes()

    await cancelOrder(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(mockCancelRun).not.toHaveBeenCalled()
  })

  it("rejects missing publishable key", async () => {
    const { req } = createReq({ headers: { "x-store-id": "default_store" } })
    const res = createRes()

    await cancelOrder(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(mockCancelRun).not.toHaveBeenCalled()
  })

  it("cancels own unpaid and unfulfilled order through the workflow", async () => {
    const { req, orderModule } = createReq({ body: { reason: "Ordered by mistake" } })
    const res = createRes()

    await cancelOrder(req, res)

    expect(mockCancelRun).toHaveBeenCalledTimes(1)
    expect(mockCancelRun).toHaveBeenCalledWith({
      input: { order_id: "order_1", canceled_by: "cus_a" },
    })
    expect(orderModule.retrieveOrder).toHaveBeenCalledWith("order_1")
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.body).toMatchObject({
      cancelled: true,
      order: {
        id: "order_1",
        display_id: 101,
        status: "cancelled",
        payment_status: "pending",
        fulfillment_status: "none",
      },
    })
  })

  it("returns idempotent success for already cancelled orders without rerunning workflow", async () => {
    const { req } = createReq({ graphOrders: [cancelledOrder] })
    const res = createRes()

    await cancelOrder(req, res)

    expect(mockCancelRun).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.body).toMatchObject({ cancelled: true, already_cancelled: true })
  })

  it("rejects orders owned by another customer even when email matches", async () => {
    const { req } = createReq({
      graphOrders: [{ ...baseOrder, customer_id: "cus_b", email: "same@example.com" }],
    })
    const res = createRes()

    await cancelOrder(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.body).toMatchObject({ error: { code: "ORDER_ACCESS_DENIED" } })
    expect(mockCancelRun).not.toHaveBeenCalled()
  })

  it("rejects wrong store orders", async () => {
    const { req } = createReq({
      graphOrders: [{ ...baseOrder, metadata: { ...baseOrder.metadata, store_id: "other_store" } }],
    })
    const res = createRes()

    await cancelOrder(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.body).toMatchObject({ error: { code: "ORDER_WRONG_STORE" } })
    expect(mockCancelRun).not.toHaveBeenCalled()
  })

  it("rejects paid orders", async () => {
    const { req } = createReq({
      graphOrders: [{ ...baseOrder, metadata: { ...baseOrder.metadata, payment_status: "paid" } }],
    })
    const res = createRes()

    await cancelOrder(req, res)

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.body).toMatchObject({ error: { code: "ORDER_ALREADY_PAID" } })
    expect(mockCancelRun).not.toHaveBeenCalled()
  })

  it("allows authorized but uncaptured orders when workflow cancels the authorization", async () => {
    const { req } = createReq({
      graphOrders: [authorizedOrder],
      retrieveOrder: cancelledAuthorizedOrder,
    })
    const res = createRes()

    await cancelOrder(req, res)

    expect(mockCancelRun).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.body).toMatchObject({
      cancelled: true,
      order: {
        id: "order_1",
        status: "cancelled",
      },
    })
  })

  it("fails closed if cancel workflow leaves an active authorization", async () => {
    const { req } = createReq({
      graphOrders: [authorizedOrder],
      retrieveOrder: {
        ...cancelledOrder,
        metadata: { ...cancelledOrder.metadata, payment_status: "authorized" },
        payment_collections: authorizedOrder.payment_collections,
      },
    })
    const res = createRes()

    await cancelOrder(req, res)

    expect(mockCancelRun).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.body).toMatchObject({ error: { code: "ORDER_CANCEL_WORKFLOW_ERROR" } })
  })

  it("rejects captured payments", async () => {
    const { req } = createReq({
      graphOrders: [
        {
          ...baseOrder,
          payment_collections: [{
            id: "paycol_1",
            status: "captured",
            captured_amount: 100,
            payments: [{ id: "pay_1", captures: [{ id: "cap_1", amount: 100 }] }],
          }],
        },
      ],
    })
    const res = createRes()

    await cancelOrder(req, res)

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.body).toMatchObject({ error: { code: "ORDER_PAYMENT_CAPTURED" } })
    expect(mockCancelRun).not.toHaveBeenCalled()
  })

  it("rejects payments with captured_at even when captured amount is zero", async () => {
    const { req } = createReq({
      graphOrders: [
        {
          ...baseOrder,
          payment_collections: [{
            id: "paycol_1",
            status: "authorized",
            captured_amount: 0,
            payments: [{ id: "pay_1", status: "authorized", captured_at: "2026-06-18T08:00:00.000Z", captures: [] }],
            payment_sessions: [{ status: "authorized" }],
          }],
        },
      ],
    })
    const res = createRes()

    await cancelOrder(req, res)

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.body).toMatchObject({ error: { code: "ORDER_PAYMENT_CAPTURED" } })
    expect(mockCancelRun).not.toHaveBeenCalled()
  })

  it("rejects completed payment collections", async () => {
    const { req } = createReq({
      graphOrders: [
        {
          ...baseOrder,
          payment_collections: [{
            id: "paycol_1",
            status: "completed",
            completed_at: "2026-06-18T08:00:00.000Z",
            authorized_amount: 2125,
            captured_amount: 0,
            payments: [{ id: "pay_1", status: "authorized", captured_at: null, captures: [] }],
            payment_sessions: [{ status: "authorized" }],
          }],
        },
      ],
    })
    const res = createRes()

    await cancelOrder(req, res)

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.body).toMatchObject({ error: { code: "ORDER_PAYMENT_CAPTURED" } })
    expect(mockCancelRun).not.toHaveBeenCalled()
  })

  it("fails closed when payment state is not loaded", async () => {
    const { payment_collections, ...orderWithoutPaymentState } = baseOrder
    const { req } = createReq({ graphOrders: [orderWithoutPaymentState] })
    const res = createRes()

    await cancelOrder(req, res)

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.body).toMatchObject({ error: { code: "ORDER_NOT_CANCELLABLE" } })
    expect(mockCancelRun).not.toHaveBeenCalled()
  })

  it("rejects native fulfillment records", async () => {
    const { req } = createReq({
      graphOrders: [{ ...baseOrder, fulfillments: [{ id: "ful_1", status: "created" }] }],
    })
    const res = createRes()

    await cancelOrder(req, res)

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.body).toMatchObject({ error: { code: "ORDER_HAS_FULFILLMENT" } })
    expect(mockCancelRun).not.toHaveBeenCalled()
  })

  it("fails closed when fulfillment state is not loaded", async () => {
    const { fulfillments, ...orderWithoutFulfillmentState } = baseOrder
    const { req } = createReq({ graphOrders: [orderWithoutFulfillmentState] })
    const res = createRes()

    await cancelOrder(req, res)

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.body).toMatchObject({ error: { code: "ORDER_HAS_FULFILLMENT" } })
    expect(mockCancelRun).not.toHaveBeenCalled()
  })

  it("rejects custom fulfillment order records", async () => {
    const { req } = createReq({
      customFulfillmentOrders: [{ id: "fo_1", status: "waiting" }],
    })
    const res = createRes()

    await cancelOrder(req, res)

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.body).toMatchObject({ error: { code: "ORDER_HAS_FULFILLMENT" } })
    expect(mockCancelRun).not.toHaveBeenCalled()
  })

  it("rejects fulfilled status even without records", async () => {
    const { req } = createReq({
      graphOrders: [{ ...baseOrder, metadata: { ...baseOrder.metadata, mc_fulfillment_status: "shipped" } }],
    })
    const res = createRes()

    await cancelOrder(req, res)

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.body).toMatchObject({ error: { code: "ORDER_ALREADY_FULFILLED" } })
    expect(mockCancelRun).not.toHaveBeenCalled()
  })

  it("validates cancel reason", async () => {
    const { req } = createReq({ body: { reason: "<script>alert(1)</script>" } })
    const res = createRes()

    await cancelOrder(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.body).toMatchObject({ error: { code: "ORDER_CANCEL_REASON_INVALID" } })
    expect(mockCancelRun).not.toHaveBeenCalled()
  })

  it("returns 500 when workflow fails", async () => {
    const { req } = createReq({ workflowError: new Error("workflow exploded") })
    const res = createRes()

    await cancelOrder(req, res)

    expect(mockCancelRun).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.body).toMatchObject({ error: { code: "ORDER_CANCEL_WORKFLOW_ERROR" } })
  })
})
