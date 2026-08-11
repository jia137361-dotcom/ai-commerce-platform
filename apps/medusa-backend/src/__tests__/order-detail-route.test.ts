import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { GET as getOrderDetail } from "../api/store/orders/[id]/detail/route"
import { GET as getAuthenticatedOrderDetail } from "../api/store/customers/me/orders/[id]/route"
import { FULFILLMENT_ORDERS_MODULE } from "../modules/fulfillment-orders"
import { BUYER_REFUND_REQUESTS_MODULE } from "../modules/buyer-refund-requests"
import { STORE_CORE_MODULE } from "../modules/store-core"

type MockRes = MedusaResponse & {
  statusCode?: number
  body?: unknown
  status: jest.Mock
  json: jest.Mock
}

const order = {
  id: "order_1",
  display_id: 63,
  customer_id: "cus_a",
  email: "buyer@example.com",
  status: "pending",
  currency_code: "usd",
  created_at: "2026-06-16T07:17:27.482Z",
  metadata: {
    store_id: "default_store",
    payment_status: "paid",
    mc_fulfillment_status: "waiting",
  },
  items: [
    {
      id: "ordli_1",
      product_id: "prod_1",
      variant_id: "variant_1",
      title: "Printed item",
      variant_title: "Default",
      quantity: 1,
      unit_price: 2125,
      subtotal: 2125,
      metadata: { color: "black", size: "M" },
    },
  ],
  shipping_address: null,
  billing_address: null,
  subtotal: 2125,
  shipping_total: 0,
  discount_total: 0,
  tax_total: 0,
  total: 2125,
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

const createReq = ({
  query = { email: "buyer@example.com" },
  headers = {
    "x-publishable-api-key": "pk_test",
    "x-store-id": "default_store",
  },
  retrievedOrder = order as Record<string, unknown>,
  retrieveError,
  authCustomerId = undefined,
  cancellationOrder,
  customFulfillmentOrders = [],
  refundRequests = [],
}: {
  query?: Record<string, unknown>
  headers?: Record<string, string>
  retrievedOrder?: Record<string, unknown>
  retrieveError?: Error
  authCustomerId?: string
  cancellationOrder?: Record<string, unknown>
  customFulfillmentOrders?: Record<string, unknown>[]
  refundRequests?: Record<string, unknown>[]
} = {}) => {
  const orderModule = {
    retrieveOrder: jest.fn(async () => {
      if (retrieveError) throw retrieveError
      return retrievedOrder
    }),
  }
  const queryGraph = {
    graph: jest.fn(async () => ({ data: [cancellationOrder ?? retrievedOrder] })),
  }
  const fulfillmentOrders = {
    listFulfillmentOrders: jest.fn(async () => customFulfillmentOrders),
  }
  const refundRequestService = {
    listBuyerRefundRequests: jest.fn(async () => refundRequests),
  }
  const storeCore = {
    listProductReviews: jest.fn(async () => []),
  }
  const req = {
    params: { id: "order_1" },
    query,
    headers,
    auth_context: authCustomerId ? { actor_id: authCustomerId } : undefined,
    scope: {
      resolve: jest.fn((key: string) => {
        if (key === Modules.ORDER) return orderModule
        if (key === ContainerRegistrationKeys.QUERY) return queryGraph
        if (key === FULFILLMENT_ORDERS_MODULE) return fulfillmentOrders
        if (key === BUYER_REFUND_REQUESTS_MODULE) return refundRequestService
        if (key === STORE_CORE_MODULE) return storeCore
        throw new Error(`Unexpected dependency: ${key}`)
      }),
    },
  } as unknown as MedusaRequest

  return { req, orderModule, queryGraph, fulfillmentOrders, refundRequestService, storeCore }
}

describe("GET /store/orders/:order_id/detail", () => {
  it("returns totals from order summary when root totals are missing", async () => {
    const { req, queryGraph } = createReq({
      authCustomerId: undefined,
      retrievedOrder: {
        ...order,
        subtotal: null,
        shipping_total: null,
        total: null,
        items: [{
          ...order.items[0],
          subtotal: null,
          unit_price: 2499,
        }],
      },
    })
    queryGraph.graph.mockResolvedValueOnce({
      data: [{
        summary: {
          totals: {
            subtotal: 2499,
            shipping_total: 500,
            total: 2999,
            current_order_total: 2999,
          },
        },
      }],
    })
    const res = createRes()

    await getOrderDetail(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.body).toMatchObject({
      subtotal: 24.99,
      shipping_total: 5,
      total: 29.99,
    })
  })

  it("returns order detail for matching email and store", async () => {
    const { req } = createReq({ authCustomerId: undefined })
    const res = createRes()

    await getOrderDetail(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.body).toMatchObject({
      order_id: "order_1",
      display_id: 63,
      store_id: "default_store",
      email: "buyer@example.com",
      payment_status: "paid",
      fulfillment_status: "waiting",
      items: [
        {
          id: "ordli_1",
          title: "Printed item",
          quantity: 1,
          unit_price: 21.25,
          subtotal: 21.25,
        },
      ],
      subtotal: 21.25,
      shipping_total: 0,
      discount_total: 0,
      tax_total: 0,
      total: 21.25,
      cancellation: {
        allowed: false,
        code: "ORDER_ACCESS_DENIED",
      },
    })
  })

  it("returns order detail for authenticated matching customer without email query", async () => {
    const { req } = createReq({ query: {}, authCustomerId: "cus_a" })
    const res = createRes()

    await getOrderDetail(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
  })

  it("authenticated detail wrapper requires a customer session", async () => {
    const { req } = createReq({ query: {}, authCustomerId: undefined })
    const res = createRes()

    await getAuthenticatedOrderDetail(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.body).toMatchObject({ error: { code: "ORDER_ACCESS_DENIED" } })
  })

  it("authenticated detail wrapper returns the current customer's order", async () => {
    const { req } = createReq({ query: {}, authCustomerId: "cus_a" })
    const res = createRes()

    await getAuthenticatedOrderDetail(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
  })

  it("returns cancellation eligibility for authenticated unpaid unfulfilled orders", async () => {
    const { req } = createReq({
      query: {},
      authCustomerId: "cus_a",
      retrievedOrder: {
        ...order,
        metadata: { store_id: "default_store", payment_status: "pending", mc_fulfillment_status: "none" },
      },
      cancellationOrder: {
        ...order,
        metadata: { store_id: "default_store", payment_status: "pending", mc_fulfillment_status: "none" },
        payment_collections: [{ id: "paycol_1", captured_amount: 0, payments: [] }],
        fulfillments: [],
      },
    })
    const res = createRes()

    await getOrderDetail(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.body).toMatchObject({
      cancellation: {
        allowed: true,
        code: null,
        message: null,
      },
      refund_request: {
        allowed: false,
        code: "ORDER_NOT_PAID",
      },
    })
  })

  it("returns refund request eligibility for authenticated captured orders", async () => {
    const capturedOrder = {
      ...order,
      currency_code: null,
      total: null,
      subtotal: null,
      payment_collections: [{
        id: "paycol_1",
        status: "completed",
        completed_at: "2026-06-16T07:17:27.482Z",
        currency_code: "usd",
        captured_amount: 2125,
        payments: [{ id: "pay_1", captured_at: "2026-06-16T07:17:27.482Z", captures: [] }],
        payment_sessions: [{ status: "captured" }],
      }],
      fulfillments: [],
    }
    const { req } = createReq({
      query: {},
      authCustomerId: "cus_a",
      retrievedOrder: capturedOrder,
      cancellationOrder: capturedOrder,
    })
    const res = createRes()

    await getOrderDetail(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.body).toMatchObject({
      cancellation: { allowed: false },
      refund_request: {
        allowed: true,
        code: null,
        requested_amount: 2125,
        currency_code: "usd",
        open_request: null,
      },
    })
  })

  it("does not offer refund requests for authorized-not-captured orders", async () => {
    const authorizedOrder = {
      ...order,
      metadata: { ...order.metadata, payment_status: "authorized", mc_fulfillment_status: "none" },
      payment_collections: [{
        id: "paycol_1",
        status: "authorized",
        authorized_amount: 2125,
        captured_amount: 0,
        completed_at: null,
        payments: [{ id: "pay_1", status: "authorized", captured_at: null, captures: [] }],
        payment_sessions: [{ status: "authorized" }],
      }],
      fulfillments: [],
    }
    const { req } = createReq({
      query: {},
      authCustomerId: "cus_a",
      retrievedOrder: authorizedOrder,
      cancellationOrder: authorizedOrder,
    })
    const res = createRes()

    await getOrderDetail(req, res)

    expect(res.body).toMatchObject({
      cancellation: { allowed: true },
      refund_request: {
        allowed: false,
        code: "ORDER_AUTHORIZED_NOT_CAPTURED",
      },
    })
  })

  it("rejects authenticated customer mismatch even when email matches", async () => {
    const { req } = createReq({ authCustomerId: "cus_b" })
    const res = createRes()

    await getOrderDetail(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
  })

  it("rejects wrong email", async () => {
    const { req } = createReq({ query: { email: "wrong@example.com" } })
    const res = createRes()

    await getOrderDetail(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
  })

  it("rejects store mismatch", async () => {
    const { req } = createReq({
      retrievedOrder: { ...order, metadata: { store_id: "other_store" } },
    })
    const res = createRes()

    await getOrderDetail(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
  })

  it("rejects missing publishable key", async () => {
    const { req } = createReq({ headers: { "x-store-id": "default_store" } })
    const res = createRes()

    await getOrderDetail(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
  })

  it("rejects missing store header", async () => {
    const { req } = createReq({ headers: { "x-publishable-api-key": "pk_test" } })
    const res = createRes()

    await getOrderDetail(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
  })

  it("returns 404 for missing order", async () => {
    const { req } = createReq({ retrieveError: new Error("Order not found") })
    const res = createRes()

    await getOrderDetail(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })

  it("does not allow guest access to email-null orders", async () => {
    const { req } = createReq({
      retrievedOrder: { ...order, email: null },
      authCustomerId: undefined,
    })
    const res = createRes()

    await getOrderDetail(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
  })
})
