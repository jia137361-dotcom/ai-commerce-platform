import { readFileSync } from "node:fs"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { GET as getCustomerOrders } from "../api/store/customers/me/orders/route"
import { CHECKOUT_PAYMENT_ATTEMPTS_MODULE } from "../modules/checkout-payment-attempts"

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
    customer_id: "cus_b",
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
  graphOrders = [],
  listError,
  attemptsService,
  cartModule,
}: {
  authCustomerId?: string | null
  query?: Record<string, unknown>
  headers?: Record<string, string>
  listedOrders?: Record<string, unknown>[]
  graphOrders?: Record<string, unknown>[]
  listError?: Error
  attemptsService?: Record<string, unknown>
  cartModule?: Record<string, unknown>
} = {}) => {
  const orderModule = {
    listOrders: jest.fn(async () => {
      if (listError) throw listError
      return listedOrders
    }),
  }
  const queryGraph = {
    graph: jest.fn(async () => ({ data: graphOrders })),
  }
  const customerModule = {
    retrieveCustomer: jest.fn(async (id: string) => ({ id, metadata: {} })),
  }
  const req = {
    query,
    headers,
    auth_context: authCustomerId ? { actor_id: authCustomerId } : undefined,
    scope: {
      resolve: jest.fn((key: string) => {
        if (key === Modules.ORDER) return orderModule
        if (key === Modules.CUSTOMER) return customerModule
        if (key === Modules.CART && cartModule) return cartModule
        if (key === CHECKOUT_PAYMENT_ATTEMPTS_MODULE && attemptsService) return attemptsService
        if (key === ContainerRegistrationKeys.QUERY) return queryGraph
        throw new Error(`Unexpected dependency: ${key}`)
      }),
    },
  } as unknown as MedusaRequest

  return { req, orderModule, queryGraph, customerModule }
}

describe("GET /store/customers/me/orders", () => {
  it("uses a static customer session import that resolves in Medusa runtime", () => {
    const source = readFileSync(
      require.resolve("../api/store/customers/me/orders/route"),
      "utf8"
    )

    expect(source).toContain('from "../../../../../lib/customer-session"')
    expect(source).not.toContain("customer-session.js")
  })

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

  it("allows missing store header when scope=platform", async () => {
    const { req } = createReq({
      query: { scope: "platform" },
      headers: { "x-publishable-api-key": "pk_test" },
    })
    const res = createRes()

    await getCustomerOrders(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.body).toMatchObject({
      count: 3,
      orders: [
        { order_id: "order_a1" },
        { order_id: "order_a2" },
        { order_id: "order_other_store" },
      ],
    })
  })

  it("returns only current customer orders for current store", async () => {
    const { req } = createReq()
    const res = createRes()

    await getCustomerOrders(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.body).toMatchObject({
      count: 2,
      orders: [
        { order_id: "order_a1", display_id: 101, item_count: 2 },
        { order_id: "order_a2", display_id: 102, item_count: 1 },
      ],
    })
  })

  it("keeps display_id values from the order summary", async () => {
    const { req } = createReq({
      listedOrders: [
        {
          id: "order_display_number",
          display_id: 70,
          customer_id: "cus_a",
          metadata: { store_id: "default_store" },
          items: [],
        },
        {
          id: "order_display_string",
          display_id: "71",
          customer_id: "cus_a",
          metadata: { store_id: "default_store" },
          items: [],
        },
      ],
    })
    const res = createRes()

    await getCustomerOrders(req, res)

    expect(res.body).toMatchObject({
      orders: [
        { order_id: "order_display_number", display_id: 70 },
        { order_id: "order_display_string", display_id: "71" },
      ],
    })
  })

  it("includes active checkout reservations in the unpaid bucket", async () => {
    const attemptsService = {
      listCheckoutPaymentAttempts: jest.fn(async () => [
        {
          id: "cpa_active",
          cart_id: "cart_active",
          store_id: "default_store",
          customer_id: "cus_a",
          provider_id: "pp_stripe_stripe",
          status: "awaiting_payment",
          expires_at: new Date(Date.now() + 10 * 60 * 1000),
          created_at: "2026-06-16T09:00:00.000Z",
        },
      ]),
      updateCheckoutPaymentAttempts: jest.fn(),
    }
    const cartModule = {
      retrieveCart: jest.fn(async () => ({
        id: "cart_active",
        customer_id: "cus_a",
        email: "a@example.com",
        currency_code: "usd",
        total: 2500,
        items: [{ title: "Reserved item", quantity: 2, thumbnail: "https://example.test/reserved.png" }],
      })),
    }
    const { req } = createReq({
      query: { bucket: "unpaid" },
      attemptsService,
      cartModule,
      listedOrders: [],
    })
    const res = createRes()

    await getCustomerOrders(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.body).toMatchObject({
      count: 1,
      orders: [
        {
          order_id: "cpa_active",
          order_kind: "checkout_reservation",
          checkout_cart_id: "cart_active",
          payment_status: "pending",
          buyer_display_status: "unpaid",
          item_count: 2,
        },
      ],
    })
  })

  it("keeps expired checkout reservations visible without mutating payment state", async () => {
    const attemptsService = {
      listCheckoutPaymentAttempts: jest.fn(async () => [
        {
          id: "cpa_expired",
          cart_id: "cart_expired",
          store_id: "default_store",
          customer_id: "cus_a",
          provider_id: "pp_stripe_stripe",
          status: "awaiting_payment",
          expires_at: new Date(Date.now() - 60 * 1000),
          created_at: "2026-06-16T09:00:00.000Z",
        },
      ]),
      updateCheckoutPaymentAttempts: jest.fn(),
    }
    const cartModule = {
      retrieveCart: jest.fn(async () => ({
        id: "cart_expired",
        customer_id: "cus_a",
        email: "a@example.com",
        currency_code: "usd",
        total: 2500,
        items: [{ title: "Expired reserved item", quantity: 1, thumbnail: "https://example.test/reserved.png" }],
      })),
    }
    const { req } = createReq({
      query: { bucket: "unpaid" },
      attemptsService,
      cartModule,
      listedOrders: [],
    })
    const res = createRes()

    await getCustomerOrders(req, res)

    expect(attemptsService.updateCheckoutPaymentAttempts).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.body).toMatchObject({
      count: 1,
      orders: [
        {
          order_id: "cpa_expired",
          order_kind: "checkout_reservation",
          checkout_cart_id: "cart_expired",
          checkout_recovery_href: null,
          payment_status: "expired",
          payment_attempt_status: "expired",
          buyer_display_status: "unpaid",
          item_count: 1,
        },
      ],
    })
  })

  it("keeps zero display_id instead of converting it to null", async () => {
    const { req } = createReq({
      listedOrders: [
        {
          id: "order_display_zero",
          display_id: 0,
          customer_id: "cus_a",
          metadata: { store_id: "default_store" },
          items: [],
        },
      ],
    })
    const res = createRes()

    await getCustomerOrders(req, res)

    expect(res.body).toMatchObject({
      orders: [{ order_id: "order_display_zero", display_id: 0 }],
    })
  })

  it("reads camelCase displayId from Medusa list DTOs", async () => {
    const { req } = createReq({
      listedOrders: [
        {
          id: "order_display_camel",
          displayId: 72,
          customer_id: "cus_a",
          metadata: { store_id: "default_store" },
          items: [],
        },
      ],
    })
    const res = createRes()

    await getCustomerOrders(req, res)

    expect(res.body).toMatchObject({
      orders: [{ order_id: "order_display_camel", display_id: 72 }],
    })
  })

  it("returns null only when display id is missing", async () => {
    const { req } = createReq({
      listedOrders: [
        {
          id: "order_display_missing",
          customer_id: "cus_a",
          metadata: { store_id: "default_store" },
          items: [],
        },
      ],
    })
    const res = createRes()

    await getCustomerOrders(req, res)

    expect(res.body).toMatchObject({
      orders: [{ order_id: "order_display_missing", display_id: null }],
    })
  })

  it("does not request unsupported customer relation population", async () => {
    const { req, orderModule } = createReq()
    const res = createRes()

    await getCustomerOrders(req, res)

    expect(orderModule.listOrders).toHaveBeenCalledWith(
      expect.objectContaining({ customer_id: "cus_a" }),
      expect.not.objectContaining({
        relations: expect.arrayContaining(["customer"]),
      })
    )
  })

  it("explicitly requests display_id from the order module list projection", async () => {
    const { req, orderModule } = createReq()
    const res = createRes()

    await getCustomerOrders(req, res)

    expect(orderModule.listOrders).toHaveBeenCalledWith(
      expect.objectContaining({ customer_id: "cus_a" }),
      expect.objectContaining({
        select: expect.arrayContaining(["id", "display_id", "canceled_at"]),
      })
    )
  })

  it("maps canceled_at orders to cancelled status", async () => {
    const { req } = createReq({
      listedOrders: [
        {
          id: "order_cancelled",
          display_id: 801,
          customer_id: "cus_a",
          status: "pending",
          canceled_at: "2026-06-18T08:00:00.000Z",
          metadata: { store_id: "default_store", payment_status: "pending", mc_fulfillment_status: "none" },
          items: [],
        },
      ],
    })
    const res = createRes()

    await getCustomerOrders(req, res)

    expect(res.body).toMatchObject({
      orders: [{ order_id: "order_cancelled", status: "cancelled" }],
    })
  })

  it("keeps selector-owned orders when DTO omits customer_id", async () => {
    const dtoWithoutCustomerIdOrders = Array.from({ length: 5 }, (_, index) => ({
      id: `order_no_customer_field_${index + 1}`,
      display_id: 500 + index,
      email: "a@example.com",
      status: "pending",
      currency_code: "usd",
      created_at: `2026-06-16T0${index}:00:00.000Z`,
      metadata: { store_id: "default_store", payment_status: "paid", mc_fulfillment_status: "waiting" },
      items: [{ title: `Relation item ${index + 1}`, quantity: 1 }],
    }))
    const { req } = createReq({ listedOrders: dtoWithoutCustomerIdOrders })
    const res = createRes()

    await getCustomerOrders(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.body).toMatchObject({
      count: 5,
      orders: [
        { order_id: "order_no_customer_field_1" },
        { order_id: "order_no_customer_field_2" },
        { order_id: "order_no_customer_field_3" },
        { order_id: "order_no_customer_field_4" },
        { order_id: "order_no_customer_field_5" },
      ],
    })
  })

  it("filters orders when DTO customer_id exists and does not match", async () => {
    const { req } = createReq({
      listedOrders: [
        {
          id: "order_wrong_customer",
          customer_id: "cus_b",
          email: "a@example.com",
          metadata: { store_id: "default_store" },
          items: [],
        },
      ],
    })
    const res = createRes()

    await getCustomerOrders(req, res)

    expect(res.body).toMatchObject({ count: 0, orders: [] })
  })

  it("does not use matching email to override an explicit customer_id mismatch", async () => {
    const { req } = createReq({
      authCustomerId: "cus_a",
      listedOrders: [
        {
          id: "order_wrong_customer_matching_email",
          customer_id: "cus_b",
          email: "a@example.com",
          metadata: { store_id: "default_store" },
          items: [],
        },
      ],
    })
    const res = createRes()

    await getCustomerOrders(req, res)

    expect(res.body).toMatchObject({ count: 0, orders: [] })
  })

  it("keeps selector-owned rows with missing DTO customer_id regardless of email", async () => {
    const { req } = createReq({
      listedOrders: [
        {
          id: "order_no_customer_id_different_email",
          email: "someone-else@example.com",
          metadata: { store_id: "default_store" },
          items: [],
        },
      ],
    })
    const res = createRes()

    await getCustomerOrders(req, res)

    expect(res.body).toMatchObject({
      count: 1,
      orders: [{ order_id: "order_no_customer_id_different_email" }],
    })
  })

  it("filters selector-owned orders from another store", async () => {
    const { req } = createReq({
      listedOrders: [
        {
          id: "order_other_store_no_customer_field",
          email: "a@example.com",
          metadata: { store_id: "other_store" },
          items: [],
        },
      ],
    })
    const res = createRes()

    await getCustomerOrders(req, res)

    expect(res.body).toMatchObject({ count: 0, orders: [] })
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

  it("falls back to query graph when order module selector returns no rows", async () => {
    const { req, queryGraph } = createReq({
      listedOrders: [],
      graphOrders: [orders[0]],
    })
    const res = createRes()

    await getCustomerOrders(req, res)

    expect(queryGraph.graph).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "order",
        filters: { customer_id: "cus_a" },
      })
    )
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.body).toMatchObject({
      count: 1,
      orders: [{ order_id: "order_a1" }],
    })
  })

  it("keeps query graph rows selected by trusted customer_id even when DTO omits customer_id", async () => {
    const { req } = createReq({
      listedOrders: [],
      graphOrders: [
        {
          id: "order_graph_no_customer_field",
          display_id: 601,
          email: "a@example.com",
          metadata: { store_id: "default_store" },
          items: [{ title: "Graph relation item", quantity: 1 }],
        },
      ],
    })
    const res = createRes()

    await getCustomerOrders(req, res)

    expect(res.body).toMatchObject({
      count: 1,
      orders: [{ order_id: "order_graph_no_customer_field" }],
    })
  })

  it("returns 500 for internal order query errors", async () => {
    const { req } = createReq({ listError: new Error("MikroORM blew up") })
    const res = createRes()

    await getCustomerOrders(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.body).toMatchObject({
      error: {
        code: "CUSTOMER_ORDERS_LIST_ERROR",
        message: "Failed to retrieve customer orders",
      },
    })
  })
})
