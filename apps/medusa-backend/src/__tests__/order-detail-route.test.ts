import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { GET as getOrderDetail } from "../api/store/orders/[id]/detail/route"
import { FULFILLMENT_ORDERS_MODULE } from "../modules/fulfillment-orders"

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
}: {
  query?: Record<string, unknown>
  headers?: Record<string, string>
  retrievedOrder?: Record<string, unknown>
  retrieveError?: Error
  authCustomerId?: string
  cancellationOrder?: Record<string, unknown>
  customFulfillmentOrders?: Record<string, unknown>[]
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
        throw new Error(`Unexpected dependency: ${key}`)
      }),
    },
  } as unknown as MedusaRequest

  return { req, orderModule, queryGraph, fulfillmentOrders }
}

describe("GET /store/orders/:order_id/detail", () => {
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
          unit_price: 2125,
          subtotal: 2125,
        },
      ],
      total: 2125,
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
