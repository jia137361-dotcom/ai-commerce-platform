import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { GET, POST } from "../api/store/customers/me/orders/[id]/refund-requests/route"
import { POST as POST_ACTION } from "../api/store/customers/me/orders/[id]/refund-requests/[request_id]/route"
import { BUYER_REFUND_REQUESTS_MODULE } from "../modules/buyer-refund-requests"
import { FULFILLMENT_ORDERS_MODULE } from "../modules/fulfillment-orders"

const mockExecuteApprovedRefund = jest.fn()

jest.mock("../lib/buyer-auth-access", () => ({
  assertBuyerEmailVerified: jest.fn(async () => true),
}))

jest.mock("../lib/refund-execution", () => ({
  executeApprovedRefund: (...args: unknown[]) => mockExecuteApprovedRefund(...args),
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

const capturedOrder = {
  id: "order_1",
  display_id: 72,
  customer_id: "cus_a",
  status: "pending",
  currency_code: "usd",
  total: 21.25,
  metadata: { store_id: "default_store", payment_status: "paid", mc_fulfillment_status: "none" },
  payment_collections: [{
    id: "paycol_1",
    status: "completed",
    completed_at: "2026-06-19T00:00:00.000Z",
    captured_amount: 21.25,
    payments: [{ id: "pay_1", status: "captured", captured_at: "2026-06-19T00:00:00.000Z", captures: [] }],
    payment_sessions: [{ status: "captured" }],
  }],
  fulfillments: [],
}

const paypalCapturedOrder = {
  ...capturedOrder,
  id: "order_paypal_44",
  customer_id: "cus_paypal",
  total: 44,
  metadata: { ...capturedOrder.metadata, store_id: "paypal_store", payment_status: "paid" },
  payment_collections: [{
    ...capturedOrder.payment_collections[0],
    id: "pay_col_paypal",
    captured_amount: 44,
    payments: [{ id: "pay_paypal", provider_id: "pp_paypal_paypal", status: "captured", captured_at: "2026-08-01T00:00:00.000Z", captures: [{ amount: 44, captured_at: "2026-08-01T00:00:00.000Z" }] }],
  }],
}

const authorizedOrder = {
  ...capturedOrder,
  metadata: { ...capturedOrder.metadata, payment_status: "authorized" },
  payment_collections: [{
    id: "paycol_1",
    status: "authorized",
    completed_at: null,
    authorized_amount: 21.25,
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
  requested_amount: 21.25,
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
  graphOrders,
  createError,
}: {
  authCustomerId?: string | null
  headers?: Record<string, string>
  body?: Record<string, unknown>
  order?: Record<string, unknown>
  existingRequests?: Record<string, unknown>[]
  graphOrders?: Record<string, unknown>[]
  createError?: Error
} = {}) => {
  const orderModule = { retrieveOrder: jest.fn(async () => order) }
  const query = { graph: jest.fn(async () => ({ data: graphOrders ?? [order] })) }
  const refundService = {
    listBuyerRefundRequests: jest.fn(async () => existingRequests),
    createBuyerRefundRequests: jest.fn(async (input: Record<string, unknown>) => {
      if (createError) throw createError
      return {
        ...requestRecord,
        ...input,
        id: "brr_created",
        created_at: requestRecord.created_at,
        updated_at: requestRecord.updated_at,
      }
    }),
    updateBuyerRefundRequests: jest.fn(async (input: Record<string, unknown>) => ({
      ...requestRecord,
      ...(existingRequests[0] ?? {}),
      ...input,
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
  req.params = { id: String(order.id ?? "order_1"), request_id: "brr_1" } as never
  return { req, refundService }
}

describe("buyer refund request routes", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockExecuteApprovedRefund.mockImplementation(async (input: { refundRequestId: string; amount: number }) => ({
      ...requestRecord,
      id: input.refundRequestId,
      requested_amount: input.amount,
      eligible_amount: input.amount,
      approved_amount: input.amount,
      status: "refunded",
    }))
  })

  it("rejects unauthenticated POST", async () => {
    const { req, refundService } = createReq({ authCustomerId: null })
    const res = createRes()
    await POST(req, res)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(refundService.createBuyerRefundRequests).not.toHaveBeenCalled()
  })

  it("resolves the authenticated owner through the customer-scoped query graph", async () => {
    const { req, refundService } = createReq()
    const res = createRes()
    await POST(req, res)
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as unknown as { graph: jest.Mock }
    expect(query.graph).toHaveBeenCalledWith(expect.objectContaining({
      entity: "order",
      filters: { id: "order_1", customer_id: "cus_a" },
    }))
    expect(refundService.createBuyerRefundRequests).toHaveBeenCalledTimes(1)
  })

  it("uses the same owner/store-scoped resolver for GET and POST", async () => {
    const { req } = createReq()
    const getRes = createRes()
    await GET(req, getRes)
    expect(getRes.status).toHaveBeenCalledWith(200)
    const postRes = createRes()
    await POST(req, postRes)
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as unknown as { graph: jest.Mock }
    expect(query.graph).toHaveBeenCalledWith(expect.objectContaining({
      filters: { id: "order_1", customer_id: "cus_a" },
    }))
    expect(postRes.status).toHaveBeenCalledWith(201)
  })

  it("does not fall back to retrieveOrder when the query graph resolves the owner", async () => {
    const { req } = createReq()
    const orderModule = req.scope.resolve(Modules.ORDER) as unknown as { retrieveOrder: jest.Mock }
    orderModule.retrieveOrder.mockRejectedValue(new Error("order module relation lookup failed"))
    const res = createRes()
    await POST(req, res)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(orderModule.retrieveOrder).not.toHaveBeenCalled()
  })

  it("returns opaque not-found for a different authenticated customer", async () => {
    const { req, refundService } = createReq({ authCustomerId: "cus_b", graphOrders: [] })
    const res = createRes()
    await POST(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.body).toMatchObject({ error: { code: "ORDER_NOT_FOUND" } })
    expect(refundService.createBuyerRefundRequests).not.toHaveBeenCalled()
  })

  it("returns opaque not-found for the right customer in another business store", async () => {
    const { req, refundService } = createReq({
      order: { ...capturedOrder, metadata: { ...capturedOrder.metadata, store_id: "other_store" } },
    })
    const res = createRes()
    await POST(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.body).toMatchObject({ error: { code: "ORDER_NOT_FOUND" } })
    expect(refundService.createBuyerRefundRequests).not.toHaveBeenCalled()
  })

  it("does not create a refund request when the ownership lookup misses", async () => {
    const { req, refundService } = createReq({ graphOrders: [] })
    const res = createRes()
    await POST(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
    expect(refundService.createBuyerRefundRequests).not.toHaveBeenCalled()
    expect(mockExecuteApprovedRefund).not.toHaveBeenCalled()
  })

  it("keeps missing payment context distinct from order not found", async () => {
    const { req, refundService } = createReq({
      order: { ...capturedOrder, total: null, payment_collections: [] },
    })
    const res = createRes()
    await POST(req, res)
    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.body).not.toMatchObject({ error: { code: "ORDER_NOT_FOUND" } })
    expect(refundService.createBuyerRefundRequests).not.toHaveBeenCalled()
  })

  it("keeps an insert failure distinct from order not found", async () => {
    const { req, refundService } = createReq({
      createError: new Error("database relation was not found during insert"),
    })
    const res = createRes()
    await POST(req, res)
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.body).toMatchObject({ error: { code: "ORDER_REFUND_REQUEST_ERROR" } })
    expect(refundService.createBuyerRefundRequests).toHaveBeenCalledTimes(1)
    expect(mockExecuteApprovedRefund).not.toHaveBeenCalled()
  })

  it("resolves a captured 44.00 PayPal order for its authenticated owner", async () => {
    const { req, refundService } = createReq({
      authCustomerId: "cus_paypal",
      headers: { "x-publishable-api-key": "pk_test", "x-store-id": "paypal_store" },
      order: paypalCapturedOrder,
    })
    const res = createRes()
    await POST(req, res)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(refundService.createBuyerRefundRequests).toHaveBeenCalledWith(expect.objectContaining({
      requested_amount: 44,
      payment_provider_id: "pp_paypal_paypal",
    }))
  })

  it("auto-refunds an eligible full-order request before production", async () => {
    const { req, refundService } = createReq()
    const res = createRes()
    await POST(req, res)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(refundService.createBuyerRefundRequests).toHaveBeenCalledWith(expect.objectContaining({
      order_id: "order_1",
      customer_id: "cus_a",
      store_id: "default_store",
      currency_code: "usd",
      requested_amount: 21.25,
      status: "auto_review",
      provider_status: "not_connected",
      metadata: { scope: "full_order" },
    }))
    expect(res.body).toMatchObject({
      refund_request: { status: "refunded", requested_amount: 21.25, currency_code: "usd" },
    })
    expect(mockExecuteApprovedRefund).toHaveBeenCalledTimes(1)
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
          authorized_amount: 21.25,
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

  it("does not reveal an order to another customer", async () => {
    const { req } = createReq({ authCustomerId: "cus_b" })
    const res = createRes()
    await POST(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.body).toMatchObject({ error: { code: "ORDER_NOT_FOUND" } })
  })

  it("does not reveal an order through another store", async () => {
    const { req } = createReq({ order: { ...capturedOrder, metadata: { ...capturedOrder.metadata, store_id: "other_store" } } })
    const res = createRes()
    await POST(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
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
        total: 20,
        payment_collections: [{ ...capturedOrder.payment_collections[0], captured_amount: 21.25 }],
      },
    })
    const res = createRes()
    await POST(req, res)
    expect(refundService.createBuyerRefundRequests).toHaveBeenCalledWith(
      expect.objectContaining({ requested_amount: 20, currency_code: "usd" })
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
          captured_amount: 22.5,
        }],
      },
    })
    const res = createRes()

    await POST(req, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(refundService.createBuyerRefundRequests).toHaveBeenCalledWith(
      expect.objectContaining({ requested_amount: 22.5, currency_code: "eur", status: "auto_review" })
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
            amount: 22.5,
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
      expect.objectContaining({ requested_amount: 22.5, currency_code: "usd" })
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

describe("buyer refund request actions", () => {
  it("cancels a reviewable request owned by the current buyer", async () => {
    const { req, refundService } = createReq({ existingRequests: [{ ...requestRecord, status: "manual_review" }] })
    req.body = { action: "cancel" } as never
    const res = createRes()

    await POST_ACTION(req, res)

    expect(refundService.updateBuyerRefundRequests).toHaveBeenCalledWith({ id: "brr_1", status: "cancelled" })
    expect(res.body).toMatchObject({ refund_request: { status: "cancelled" } })
  })

  it("rejects cancellation after provider processing starts", async () => {
    const { req, refundService } = createReq({ existingRequests: [{ ...requestRecord, status: "refund_processing" }] })
    req.body = { action: "cancel" } as never
    const res = createRes()

    await POST_ACTION(req, res)

    expect(res.status).toHaveBeenCalledWith(409)
    expect(refundService.updateBuyerRefundRequests).not.toHaveBeenCalled()
  })

  it("accepts additional information only when requested by the seller", async () => {
    const { req, refundService } = createReq({ existingRequests: [{ ...requestRecord, status: "awaiting_information" }] })
    req.body = { action: "provide_information", note: "Photo and package details supplied." } as never
    const res = createRes()

    await POST_ACTION(req, res)

    expect(refundService.updateBuyerRefundRequests).toHaveBeenCalledWith(expect.objectContaining({
      id: "brr_1",
      status: "manual_review",
      note: "Photo and package details supplied.",
    }))
  })

  it("does not expose another buyer's refund request", async () => {
    const { req, refundService } = createReq({ authCustomerId: "cus_b", existingRequests: [requestRecord] })
    req.body = { action: "cancel" } as never
    const res = createRes()

    await POST_ACTION(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(refundService.updateBuyerRefundRequests).not.toHaveBeenCalled()
  })
})

describe("buyer refund request monetary schema", () => {
  it("migrates every raw BigNumber companion required by refund request insertion", () => {
    const migration = readFileSync(
      join(
        process.cwd(),
        "src/modules/buyer-refund-requests/migrations/Migration20260802000300.ts"
      ),
      "utf8"
    )

    expect(migration).toContain('"raw_requested_amount" jsonb null')
    expect(migration).toContain('"raw_eligible_amount" jsonb null')
    expect(migration).toContain('"raw_approved_amount" jsonb null')
    expect(migration).toContain('alter column "raw_requested_amount" set not null')
    expect(migration).toContain("'precision', 20")
  })
})
