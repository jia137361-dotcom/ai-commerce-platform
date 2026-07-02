import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

const mockCompleteRun = jest.fn()
const mockEnsureCartPaymentReady = jest.fn()
const mockFindCartPaymentSession = jest.fn()
const mockSetOrderPostCompletePendingMetadata = jest.fn()
const mockSeedFulfillmentOrderIfMissing = jest.fn()
const mockSyncFulfillmentPayloadFromOrder = jest.fn()
const mockMarkOrderPaidAndFulfillmentWaiting = jest.fn()
const mockSyncPaidIfPaymentAlreadyCaptured = jest.fn()

jest.mock("@medusajs/medusa/core-flows", () => ({
  completeCartWorkflow: jest.fn(() => ({ run: mockCompleteRun })),
}))

jest.mock("../lib/ensure-cart-payment-ready", () => ({
  ensureCartPaymentReady: (...args: unknown[]) => mockEnsureCartPaymentReady(...args),
  findCartPaymentSession: (...args: unknown[]) => mockFindCartPaymentSession(...args),
}))

jest.mock("../lib/sync-order-paid-fulfillment", () => ({
  setOrderPostCompletePendingMetadata: (...args: unknown[]) => mockSetOrderPostCompletePendingMetadata(...args),
  seedFulfillmentOrderIfMissing: (...args: unknown[]) => mockSeedFulfillmentOrderIfMissing(...args),
  syncPaidIfPaymentAlreadyCaptured: (...args: unknown[]) => mockSyncPaidIfPaymentAlreadyCaptured(...args),
  markOrderPaidAndFulfillmentWaiting: (...args: unknown[]) => mockMarkOrderPaidAndFulfillmentWaiting(...args),
  providerDefersPaidUntilCapture: () => false,
}))

jest.mock("../lib/sync-fulfillment-line-items", () => ({
  syncFulfillmentPayloadFromOrder: (...args: unknown[]) => mockSyncFulfillmentPayloadFromOrder(...args),
}))

jest.mock("../lib/sync-cart-line-item-shipping", () => ({
  syncCartLineItemShippingRequirements: jest.fn().mockResolvedValue(false),
}))

jest.mock("../lib/s2bdiy/push-s2b-order", () => ({
  pushOrderToS2bdiy: jest.fn(),
}))

jest.mock("../modules/suppliers/s2bdiy/config", () => ({
  getS2bdiyConfig: () => null,
  isS2bdiyEnabled: () => false,
  isS2bdiyMockMode: () => false,
}))

import { POST as completeCart } from "../api/store/carts/[id]/complete/route"

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

const createReq = ({
  authCustomerId = "cus_a",
  cartCustomerId = "cus_a",
  orderCustomerId = "cus_a",
  persistCustomerUpdate = true,
  items = [{ id: "line_1", quantity: 1, requires_shipping: false }],
  shippingAddress = null,
  shippingMethods = [],
  paymentProviderId,
}: {
  authCustomerId?: string | null
  cartCustomerId?: string | null
  orderCustomerId?: string | null
  persistCustomerUpdate?: boolean
  items?: Array<Record<string, unknown>>
  shippingAddress?: Record<string, unknown> | null
  shippingMethods?: Array<Record<string, unknown>>
  paymentProviderId?: string
} = {}) => {
  let order = {
    id: "order_1",
    customer_id: orderCustomerId,
    email: "buyer@example.com",
    currency_code: "usd",
    total: 2500,
    metadata: {},
  }
  const cartModule = {
    retrieveCart: jest.fn(async () => ({
      id: "cart_1",
      customer_id: cartCustomerId,
      email: "buyer@example.com",
      items,
      shipping_address: shippingAddress,
      shipping_methods: shippingMethods,
      metadata: { store_id: "default_store" },
    })),
  }
  const orderModule = {
    retrieveOrder: jest.fn(async () => order),
    updateOrders: jest.fn(async (_id: string, patch: Partial<typeof order>) => {
      if (!persistCustomerUpdate && "customer_id" in patch) {
        return order
      }
      order = {
        ...order,
        ...patch,
        metadata: {
          ...order.metadata,
          ...(patch.metadata ?? {}),
        },
      }
      return order
    }),
  }
  const query = {
    graph: jest.fn(async () => ({
      data: [{ payment_collection: { id: "paycol_1" } }],
    })),
  }
  const req = {
    params: { id: "cart_1" },
    body: paymentProviderId ? { payment_provider_id: paymentProviderId } : {},
    headers: {
      "x-publishable-api-key": "pk_test",
      "x-store-id": "default_store",
    },
    auth_context: authCustomerId ? { actor_id: authCustomerId } : undefined,
    scope: {
      resolve: jest.fn((key: string) => {
        if (key === Modules.CART) return cartModule
        if (key === Modules.ORDER) return orderModule
        if (key === ContainerRegistrationKeys.QUERY) return query
        throw new Error(`Unexpected dependency: ${key}`)
      }),
    },
  } as unknown as MedusaRequest

  return { req, cartModule, orderModule, query }
}

describe("POST /store/carts/:id/complete authenticated ownership", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCompleteRun.mockResolvedValue({ result: { id: "order_1" } })
    mockFindCartPaymentSession.mockResolvedValue(null)
  })

  it("rejects authenticated complete when cart is not bound to current customer", async () => {
    const { req } = createReq({ authCustomerId: "cus_a", cartCustomerId: "cus_b" })
    const res = createRes()

    await completeCart(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(mockCompleteRun).not.toHaveBeenCalled()
  })

  it("returns a real order id and customer ownership after complete", async () => {
    const { req } = createReq({ authCustomerId: "cus_a", cartCustomerId: "cus_a", orderCustomerId: "cus_a" })
    const res = createRes()

    await completeCart(req, res)

    expect(mockCompleteRun).toHaveBeenCalledTimes(1)
    expect(mockSetOrderPostCompletePendingMetadata).toHaveBeenCalledWith(expect.anything(), "order_1", "default_store")
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.body).toMatchObject({
      order_id: "order_1",
      store_id: "default_store",
      cart_customer_id: "cus_a",
      order_customer_id: "cus_a",
    })
  })

  it("applies trusted cart customer_id when complete workflow omits order.customer_id", async () => {
    const { req, orderModule } = createReq({ authCustomerId: "cus_a", cartCustomerId: "cus_a", orderCustomerId: null })
    const res = createRes()

    await completeCart(req, res)

    expect(orderModule.updateOrders).toHaveBeenCalledWith("order_1", { customer_id: "cus_a" })
    expect(res.body).toMatchObject({
      order_id: "order_1",
      cart_customer_id: "cus_a",
      order_customer_id: "cus_a",
    })
  })

  it("fails complete when customer_id backfill does not persist", async () => {
    const { req } = createReq({
      authCustomerId: "cus_a",
      cartCustomerId: "cus_a",
      orderCustomerId: null,
      persistCustomerUpdate: false,
    })
    const res = createRes()

    await completeCart(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.body).toMatchObject({
      error: {
        code: "CART_COMPLETE_ERROR",
        message: "Completed order customer_id could not be persisted",
      },
    })
  })

  it("rejects shippable carts without a shipping address", async () => {
    const { req } = createReq({
      items: [{ id: "line_1", quantity: 1, requires_shipping: true }],
      shippingAddress: null,
      shippingMethods: [{ id: "sm_1", shipping_option_id: "so_1" }],
    })
    const res = createRes()

    await completeCart(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.body).toMatchObject({
      error: {
        code: "CART_SHIPPING_ADDRESS_REQUIRED",
      },
    })
    expect(mockCompleteRun).not.toHaveBeenCalled()
  })

  it("rejects shippable carts without a shipping method", async () => {
    const { req } = createReq({
      items: [{ id: "line_1", quantity: 1, requires_shipping: true }],
      shippingAddress: { id: "addr_1", country_code: "cn" },
      shippingMethods: [],
    })
    const res = createRes()

    await completeCart(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.body).toMatchObject({
      error: {
        code: "CART_SHIPPING_METHOD_REQUIRED",
      },
    })
    expect(mockCompleteRun).not.toHaveBeenCalled()
  })

  it("completes shippable carts with address and shipping method", async () => {
    const { req } = createReq({
      items: [{ id: "line_1", quantity: 1, requires_shipping: true }],
      shippingAddress: { id: "addr_1", country_code: "cn" },
      shippingMethods: [{ id: "sm_1", shipping_option_id: "so_1" }],
    })
    const res = createRes()

    await completeCart(req, res)

    expect(mockCompleteRun).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(200)
  })

  it("rejects Stripe completion without a frontend-initialized client secret", async () => {
    const { req } = createReq({ paymentProviderId: "pp_stripe_stripe" })
    const res = createRes()

    await completeCart(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.body).toMatchObject({ error: { code: "STRIPE_PAYMENT_SESSION_REQUIRED" } })
    expect(mockCompleteRun).not.toHaveBeenCalled()
    expect(mockEnsureCartPaymentReady).not.toHaveBeenCalled()
  })

  it("allows Stripe completion with an initialized official payment session", async () => {
    mockFindCartPaymentSession.mockResolvedValue({
      provider_id: "pp_stripe_stripe",
      status: "pending",
      data: { client_secret: "pi_test_secret_123" },
    })
    const { req } = createReq({ paymentProviderId: "pp_stripe_stripe" })
    const res = createRes()

    await completeCart(req, res)

    expect(mockCompleteRun).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(200)
  })
})
