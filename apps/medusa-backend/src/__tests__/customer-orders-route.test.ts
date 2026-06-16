import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { GET as getCustomerOrders } from "../api/store/customers/me/orders/route"

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

const orders = [
  {
    id: "order_a1",
    display_id: 101,
    customer_id: "cus_a",
    email: "a@example.com",
    status: "pending",
    currency_code: "usd",
    created_at: "2026-06-16T08:00:00.000Z",
    total: 2500,
    metadata: { store_id: "default_store", payment_status: "paid", mc_fulfillment_status: "waiting" },
    items: [{ title: "A item", thumbnail: "https://example.test/a.png", quantity: 2 }],
  },
  {
    id: "order_a2",
    display_id: 102,
    customer_id: "cus_a",
    email: "a@example.com",
    status: "completed",
    currency_code: "usd",
    created_at: "2026-06-16T07:00:00.000Z",
    total: 1100,
    metadata: { store_id: "default_store", payment_status: "pending", mc_fulfillment_status: "none" },
    items: [{ title: "A second item", quantity: 1 }],
  },
  {
    id: "order_other_customer",
    display_id: 201,
    customer_id: "cus_b",
    email: "b@example.com",
    status: "pending",
    currency_code: "usd",
    created_at: "2026-06-16T06:00:00.000Z",
    total: 900,
    metadata: { store_id: "default_store", payment_status: "paid", mc_fulfillment_status: "waiting" },
    items: [{ title: "B item", quantity: 1 }],
  },
  {
    id: "order_other_store",
    display_id: 301,
    customer_id: "cus_a",
    email: "a@example.com",
    status: "pending",
    currency_code: "usd",
    created_at: "2026-06-16T05:00:00.000Z",
    total: 1200,
    metadata: { store_id: "other_store", payment_status: "paid", mc_fulfillment_status: "waiting" },
    items: [{ title: "Other store item", quantity: 1 }],
  },
  {
    id: "order_guest",
    display_id: 401,
    customer_id: null,
    email: "guest@example.com",
    status: "pending",
    currency_code: "usd",
    created_at: "2026-06-16T04:00:00.000Z",
    total: 300,
    metadata: { store_id: "default_store", payment_status: "paid", mc_fulfillment_status: "waiting" },
    items: [{ title: "Guest item", quantity: 1 }],
  },
]

const createReq = ({
  authCustomerId = "cus_a",
  query = {},
  headers = {
    "x-publishable-api-key": "pk_test",
    "x-store-id": "default_store",
  },
  listedOrders = orders,
}: {
  authCustomerId?: string | null
  query?: Record<string, unknown>
  headers?: Record<string, string>
  listedOrders?: Record<string, unknown>[]
} = {}) => {
  const orderModule = {
    listOrders: jest.fn(async () => listedOrders),
  }
  const req = {
    query,
    headers,
    auth_context: authCustomerId ? { actor_id: authCustomerId } : undefined,
    scope: {
      resolve: jest.fn((key: string) => {
        if (key === Modules.ORDER) return orderModule
        throw new Error(`Unexpected dependency: ${key}`)
      }),
    },
  } as unknown as MedusaRequest

  return { req, orderModule }
}

describe("GET /store/customers/me/orders", () => {
  it("requires authenticated customer session", async () => {
    const { req } = createReq({ authCustomerId: null })
    const res = createRes()

    await getCustomerOrders(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
  })

  it("rejects missing publishable key", async () => {
    const { req } = createReq({ headers: { "x-store-id": "default_store" } })
    const res = createRes()

    await getCustomerOrders(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
  })

  it("rejects missing store header", async () => {
    const { req } = createReq({ headers: { "x-publishable-api-key": "pk_test" } })
    const res = createRes()

    await getCustomerOrders(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
  })

  it("returns only current customer orders for current store", async () => {
    const { req } = createReq()
    const res = createRes()

    await getCustomerOrders(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.body).toMatchObject({
      count: 2,
      orders: [
        { order_id: "order_a1", item_count: 2 },
        { order_id: "order_a2", item_count: 1 },
      ],
    })
  })

  it("does not trust query customer_id", async () => {
    const { req, orderModule } = createReq({ query: { customer_id: "cus_b" } })
    const res = createRes()

    await getCustomerOrders(req, res)

    expect(orderModule.listOrders).toHaveBeenCalledWith(
      expect.objectContaining({ customer_id: "cus_a" }),
      expect.anything()
    )
    expect(res.body).toMatchObject({ count: 2 })
  })

  it("supports pagination over filtered orders", async () => {
    const { req } = createReq({ query: { limit: "1", offset: "1" } })
    const res = createRes()

    await getCustomerOrders(req, res)

    expect(res.body).toMatchObject({
      count: 2,
      limit: 1,
      offset: 1,
      orders: [{ order_id: "order_a2" }],
    })
  })

  it("supports payment and fulfillment status filters", async () => {
    const { req } = createReq({
      query: {
        payment_status: "paid",
        fulfillment_status: "waiting",
      },
    })
    const res = createRes()

    await getCustomerOrders(req, res)

    expect(res.body).toMatchObject({
      count: 1,
      orders: [{ order_id: "order_a1" }],
    })
  })

  it("supports native order status filter", async () => {
    const { req, orderModule } = createReq({ query: { status: "completed" } })
    const res = createRes()

    await getCustomerOrders(req, res)

    expect(orderModule.listOrders).toHaveBeenCalledWith(
      expect.objectContaining({ status: "completed", customer_id: "cus_a" }),
      expect.anything()
    )
  })
})
