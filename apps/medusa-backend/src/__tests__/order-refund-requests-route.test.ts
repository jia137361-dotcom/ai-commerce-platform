import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { GET, POST } from "../api/store/customers/me/orders/[id]/refund-requests/route"
import { BUYER_REFUND_REQUESTS_MODULE } from "../modules/buyer-refund-requests"
import { FULFILLMENT_ORDERS_MODULE } from "../modules/fulfillment-orders"

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

const capturedOrder = {
  id: "order_1",
  display_id: 72,
  customer_id: "cus_a",
  status: "pending",
  currency_code: "usd",
  total: 2125,
  metadata: { store_id: "default_store", payment_status: "paid", mc_fulfillment_status: "none" },
  payment_collections: [{
    id: "paycol_1",
    status: "completed",
    completed_at: "2026-06-19T00:00:00.000Z",
    captured_amount: 2125,
    payments: [{ id: "pay_1", status: "captured", captured_at: "2026-06-19T00:00:00.000Z", captures: [] }],
    payment_sessions: [{ status: "captured" }],
  }],
  fulfillments: [],
}

const authorizedOrder = {
  ...capturedOrder,
  metadata: { ...capturedOrder.metadata, payment_status: "authorized" },
  payment_collections: [{
    id: "paycol_1",
    status: "authorized",
    completed_at: null,
    authorized_amount: 2125,
    captured_amount: 0,
    payments: [{ id: "pay_1", status: "authorized", captured_at: null, captures: [] }],
    payment_sessions: [{ status: "authorized" }],
  }],
}

const requestRecord = {
  id: "brr_1",
  order_id: "order_1",
  display_id: 72,
  customer_id: "cus_a",
  store_id: "default_store",
  currency_code: "usd",
  requested_amount: 2125,
  approved_amount: null,
  reason: "Ordered by mistake",
  note: null,
  status: "pending",
  payment_provider_id: null,
  external_refund_id: null,
  provider_status: "not_connected",
  provider_payload: { secret: "must-not-leak" },
  created_at: "2026-06-19T00:00:00.000Z",
  updated_at: "2026-06-19T00:00:00.000Z",
}

const createReq = ({
  authCustomerId = "cus_a",
  headers = { "x-publishable-api-key": "pk_test", "x-store-id": "default_store" },
  body = { reason: "Ordered by mistake" },
  order = capturedOrder as Record<string, unknown>,
  existingRequests = [] as Record<string, unknown>[],
}: {
  authCustomerId?: string | null
  headers?: Record<string, string>
  body?: Record<string, unknown>
  order?: Record<string, unknown>
  existingRequests?: Record<string, unknown>[]
} = {}) => {
  const orderModule = { retrieveOrder: jest.fn(async () => order) }
  const query = { graph: jest.fn(async () => ({ data: [order] })) }
  const refundService = {
    listBuyerRefundRequests: jest.fn(async () => existingRequests),
    createBuyerRefundRequests: jest.fn(async (input: Record<string, unknown>) => ({
      ...requestRecord,
      ...input,
      id: "brr_created",
      created_at: requestRecord.created_at,
      updated_at: requestRecord.updated_at,
    })),
  }
  const fulfillmentService = { listFulfillmentOrders: jest.fn(async () => []) }
  const req = {
    params: { id: "order_1" },
    headers,
    body,
    auth_context: authCustomerId ? { actor_id: authCustomerId } : undefined,
    scope: {
      resolve: jest.fn((key: string) => {
        if (key === Modules.ORDER) return orderModule
        if (key === ContainerRegistrationKeys.QUERY) return query
        if (key === BUYER_REFUND_REQUESTS_MODULE) return refundService
        if (key === FULFILLMENT_ORDERS_MODULE) return fulfillmentService
        throw new Error(`Unexpected dependency: ${key}`)
      }),
    },
  } as unknown as MedusaRequest
  return { req, refundService }
}

describe("buyer refund request routes", () => {
  it("rejects unauthenticated POST", async () => {
    const { req, refundService } = createReq({ authCustomerId: null })
    const res = createRes()
    await POST(req, res)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(refundService.createBuyerRefundRequests).not.toHaveBeenCalled()
  })

  it("creates a pending full-order request for own captured order", async () => {
    const { req, refundService } = createReq()
    const res = createRes()
    await POST(req, res)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(refundService.createBuyerRefundRequests).toHaveBeenCalledWith(expect.objectContaining({
      order_id: "order_1",
      customer_id: "cus_a",
      store_id: "default_store",
      currency_code: "usd",
      requested_amount: 2125,
      status: "pending",
      provider_status: "not_connected",
      metadata: { scope: "full_order" },
    }))
    expect(res.body).toMatchObject({
      refund_request: { status: "pending", requested_amount: 2125, currency_code: "usd" },
    })
    expect(JSON.stringify(res.body)).not.toContain("must-not-leak")
  })

  it("rejects authorized-not-captured orders", async () => {
    const { req, refundService } = createReq({
      order: {
        ...authorizedOrder,
        total: null,
        currency_code: "usd",
        payment_collections: [{
          ...authorizedOrder.payment_collections[0],
          currency_code: "usd",
          authorized_amount: 2125,
          captured_amount: 0,
        }],
      },
    })
    const res = createRes()
    await POST(req, res)
    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.body).toMatchObject({ error: { code: "ORDER_AUTHORIZED_NOT_CAPTURED" } })
    expect(refundService.createBuyerRefundRequests).not.toHaveBeenCalled()
  })

  it("rejects cancelled orders", async () => {
    const { req } = createReq({ order: { ...capturedOrder, status: "canceled", canceled_at: "now" } })
    const res = createRes()
    await POST(req, res)
    expect(res.body).toMatchObject({ error: { code: "ORDER_CANCELLED" } })
  })

  it("rejects another customer", async () => {
    const { req } = createReq({ authCustomerId: "cus_b" })
    const res = createRes()
    await POST(req, res)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.body).toMatchObject({ error: { code: "ORDER_ACCESS_DENIED" } })
  })

  it("rejects another store", async () => {
    const { req } = createReq({ order: { ...capturedOrder, metadata: { ...capturedOrder.metadata, store_id: "other_store" } } })
    const res = createRes()
    await POST(req, res)
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it("rejects duplicate open requests", async () => {
    const { req } = createReq({ existingRequests: [requestRecord] })
    const res = createRes()
    await POST(req, res)
    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.body).toMatchObject({ error: { code: "ORDER_REFUND_REQUEST_EXISTS" } })
  })

  it("requires and validates reason", async () => {
    const missing = createReq({ body: {} })
    const missingRes = createRes()
    await POST(missing.req, missingRes)
    expect(missingRes.body).toMatchObject({ error: { code: "REFUND_REQUEST_REASON_REQUIRED" } })

    const invalid = createReq({ body: { reason: "x".repeat(201) } })
    const invalidRes = createRes()
    await POST(invalid.req, invalidRes)
    expect(invalidRes.body).toMatchObject({ error: { code: "REFUND_REQUEST_REASON_INVALID" } })
  })

  it("validates note length", async () => {
    const { req } = createReq({ body: { reason: "Other", note: "x".repeat(1001) } })
    const res = createRes()
    await POST(req, res)
    expect(res.body).toMatchObject({ error: { code: "REFUND_REQUEST_NOTE_INVALID" } })
  })

  it("uses captured amount capped by order total", async () => {
    const { req, refundService } = createReq({
      order: {
        ...capturedOrder,
        total: 2000,
        payment_collections: [{ ...capturedOrder.payment_collections[0], captured_amount: 2125 }],
      },
    })
    const res = createRes()
    await POST(req, res)
    expect(refundService.createBuyerRefundRequests).toHaveBeenCalledWith(
      expect.objectContaining({ requested_amount: 2000, currency_code: "usd" })
    )
  })

  it("uses payment collection captured amount and currency when order total is null", async () => {
    const { req, refundService } = createReq({
      order: {
        ...capturedOrder,
        total: null,
        currency_code: null,
        payment_collections: [{
          ...capturedOrder.payment_collections[0],
          currency_code: "eur",
          captured_amount: 2250,
        }],
      },
    })
    const res = createRes()

    await POST(req, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(refundService.createBuyerRefundRequests).toHaveBeenCalledWith(
      expect.objectContaining({ requested_amount: 2250, currency_code: "eur", status: "pending" })
    )
  })

  it("uses captured payment amount when order total and collection captured amount are null", async () => {
    const { req, refundService } = createReq({
      order: {
        ...capturedOrder,
        total: null,
        currency_code: null,
        payment_collections: [{
          id: "paycol_1",
          status: "completed",
          completed_at: "2026-06-19T00:00:00.000Z",
          currency_code: "usd",
          captured_amount: 0,
          payments: [{
            id: "pay_1",
            status: "captured",
            captured_at: "2026-06-19T00:00:00.000Z",
            amount: 2250,
            currency_code: "usd",
            captures: [],
          }],
          payment_sessions: [{ status: "captured" }],
        }],
      },
    })
    const res = createRes()

    await POST(req, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(refundService.createBuyerRefundRequests).toHaveBeenCalledWith(
      expect.objectContaining({ requested_amount: 2250, currency_code: "usd" })
    )
  })

  it("fails closed when paid status has no amount evidence and order total is null", async () => {
    const { req } = createReq({
      order: {
        ...capturedOrder,
        total: null,
        currency_code: "usd",
        payment_collections: [{
          id: "paycol_1",
          status: "completed",
          completed_at: "2026-06-19T00:00:00.000Z",
          currency_code: "usd",
          captured_amount: 0,
          payments: [],
          payment_sessions: [{ status: "captured" }],
        }],
      },
    })
    const res = createRes()

    await POST(req, res)

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.body).toMatchObject({ error: { code: "ORDER_REFUND_NOT_SUPPORTED" } })
  })

  it("allows captured_at evidence when aggregate captured amount is zero", async () => {
    const { req } = createReq({
      order: {
        ...capturedOrder,
        metadata: { ...capturedOrder.metadata, payment_status: "pending" },
        payment_collections: [{
          ...capturedOrder.payment_collections[0],
          status: "authorized",
          completed_at: null,
          captured_amount: 0,
          payments: [{ id: "pay_1", status: "authorized", captured_at: "now", captures: [] }],
        }],
      },
    })
    const res = createRes()
    await POST(req, res)
    expect(res.status).toHaveBeenCalledWith(201)
  })

  it("GET lists only scoped requests without provider payload", async () => {
    const { req, refundService } = createReq({ existingRequests: [requestRecord] })
    const res = createRes()
    await GET(req, res)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(refundService.listBuyerRefundRequests).toHaveBeenCalledWith(
      { order_id: "order_1", customer_id: "cus_a", store_id: "default_store" },
      { order: { created_at: "DESC" } }
    )
    expect(res.body).toMatchObject({ refund_requests: [{ id: "brr_1", status: "pending" }] })
    expect(JSON.stringify(res.body)).not.toContain("must-not-leak")
  })
})
