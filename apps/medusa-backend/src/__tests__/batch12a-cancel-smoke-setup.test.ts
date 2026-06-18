import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { FULFILLMENT_ORDERS_MODULE } from "../modules/fulfillment-orders"
import { STORE_CORE_MODULE } from "../modules/store-core"

var mockCreateCartRun = jest.fn()
var mockAddLineItemRun = jest.fn()
var mockUpdateCartRun = jest.fn()
var mockCompleteCartRun = jest.fn()
var mockEnsureCartPaymentReady = jest.fn()
var mockSetOrderPostCompletePendingMetadata = jest.fn()
var mockMarkOrderPaidAndFulfillmentWaiting = jest.fn()

jest.mock("../workflows/create-cart", () => jest.fn(() => ({ run: mockCreateCartRun })))
jest.mock("../workflows/add-line-item", () => jest.fn(() => ({ run: mockAddLineItemRun })))
jest.mock("@medusajs/medusa/core-flows", () => ({
  updateCartWorkflow: jest.fn(() => ({ run: mockUpdateCartRun })),
  completeCartWorkflow: jest.fn(() => ({ run: mockCompleteCartRun })),
}))
jest.mock("../lib/ensure-cart-payment-ready", () => ({
  ensureCartPaymentReady: (...args: unknown[]) => mockEnsureCartPaymentReady(...args),
}))
jest.mock("../lib/sync-order-paid-fulfillment", () => ({
  setOrderPostCompletePendingMetadata: (...args: unknown[]) =>
    mockSetOrderPostCompletePendingMetadata(...args),
  markOrderPaidAndFulfillmentWaiting: (...args: unknown[]) =>
    mockMarkOrderPaidAndFulfillmentWaiting(...args),
}))

import {
  assertBatch12aSmokeEnabled,
  createBatch12aCancellationSmokeOrder,
  validateCancellationSmokeOrder,
} from "../scripts/batch12a-cancel-smoke-setup"

const baseOrder = {
  id: "order_smoke",
  display_id: 1201,
  customer_id: "cus_smoke",
  status: "pending",
  metadata: {
    store_id: "default_store",
    payment_status: "pending",
    mc_fulfillment_status: "none",
    batch12a_cancel_smoke: true,
    batch12a_smoke_cart_id: "cart_smoke",
    batch12a_smoke_variant_id: "variant_smoke",
    batch12a_smoke_sales_channel_id: "sc_smoke",
    batch12a_smoke_region_id: "reg_smoke",
    batch12a_smoke_currency_code: "usd",
    batch12a_smoke_line_item_unit_price: 2250,
  },
  payment_collections: [
    {
      id: "paycol_smoke",
      status: "pending",
      captured_amount: 0,
      payments: [],
      payment_sessions: [{ status: "pending" }],
    },
  ],
  fulfillments: [],
}

const graphResult = (data: Array<Record<string, unknown>>) => ({ data })

const makeContainer = ({
  order = baseOrder,
  existingOrders = [],
  customers = [{ id: "cus_smoke", email: "batch12a@example.com" }],
  customFulfillments = [],
}: {
  order?: Record<string, unknown>
  existingOrders?: Array<Record<string, unknown>>
  customers?: Array<Record<string, unknown>>
  customFulfillments?: Array<Record<string, unknown>>
} = {}) => {
  let latestOrder = { ...order }
  const query = {
    graph: jest.fn(async (input: { entity: string; filters?: Record<string, unknown> }) => {
      if (input.entity === "cart") {
        return graphResult([{ id: "cart_smoke", payment_collection: { id: "paycol_smoke" } }])
      }
      if (input.entity === "order") {
        return graphResult([latestOrder])
      }
      return graphResult([])
    }),
  }
  const customerModule = {
    listCustomers: jest.fn(async () => customers),
    createCustomers: jest.fn(async (input: Record<string, unknown>) => ({
      id: "cus_created",
      ...input,
    })),
  }
  const orderModule = {
    listOrders: jest.fn(async () => existingOrders),
    retrieveOrder: jest.fn(async () => latestOrder),
    updateOrders: jest.fn(async (_id: string, patch: Record<string, unknown>) => {
      latestOrder = {
        ...latestOrder,
        ...patch,
        metadata: {
          ...((latestOrder.metadata as Record<string, unknown> | undefined) ?? {}),
          ...((patch.metadata as Record<string, unknown> | undefined) ?? {}),
        },
      }
      return latestOrder
    }),
  }
  const storeCore = {
    listProducts: jest.fn(async () => [
      {
        id: "mc_prod",
        store_id: "default_store",
        status: "published",
        medusa_variant_id: "variant_smoke",
      },
    ]),
  }
  const productModule = {
    retrieveProductVariant: jest.fn(async () => ({
      id: "variant_smoke",
      requires_shipping: false,
    })),
  }
  const fulfillmentOrders = {
    listFulfillmentOrders: jest.fn(async () => customFulfillments),
  }
  const container = {
    resolve: jest.fn((key: string) => {
      if (key === ContainerRegistrationKeys.QUERY) return query
      if (key === Modules.CUSTOMER) return customerModule
      if (key === Modules.ORDER) return orderModule
      if (key === STORE_CORE_MODULE) return storeCore
      if (key === Modules.PRODUCT) return productModule
      if (key === FULFILLMENT_ORDERS_MODULE) return fulfillmentOrders
      throw new Error(`Unexpected dependency: ${key}`)
    }),
  }

  return {
    container: container as any,
    query,
    customerModule,
    orderModule,
    storeCore,
    productModule,
    fulfillmentOrders,
  }
}

describe("Batch 12A cancel smoke setup", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateCartRun.mockResolvedValue({
      result: {
        cart: {
          id: "cart_smoke",
          sales_channel_id: "sc_smoke",
          region_id: "reg_smoke",
          currency_code: "usd",
          metadata: { store_id: "default_store" },
        },
      },
    })
    mockAddLineItemRun.mockResolvedValue({
      result: { lineItem: { id: "li_smoke", unit_price: 2250 } },
    })
    mockUpdateCartRun.mockResolvedValue({ result: {} })
    mockCompleteCartRun.mockResolvedValue({ result: { id: "order_smoke" } })
    mockEnsureCartPaymentReady.mockResolvedValue(undefined)
    mockSetOrderPostCompletePendingMetadata.mockResolvedValue(undefined)
  })

  it("requires an explicit development-only enable flag", () => {
    expect(() => assertBatch12aSmokeEnabled({ NODE_ENV: "development" })).toThrow(
      "BATCH12A_CANCEL_SMOKE_ENABLED"
    )
    expect(() =>
      assertBatch12aSmokeEnabled({
        NODE_ENV: "production",
        BATCH12A_CANCEL_SMOKE_ENABLED: "true",
      })
    ).toThrow("cannot run in production")
  })

  it("creates a cancellable unpaid unfulfilled order sample without paid sync", async () => {
    const { container, orderModule } = makeContainer()

    await expect(
      createBatch12aCancellationSmokeOrder({
        container,
        env: {
          NODE_ENV: "development",
          BATCH12A_CANCEL_SMOKE_ENABLED: "true",
          BATCH12A_CUSTOMER_EMAIL: "batch12a@example.com",
          BATCH12A_CANCEL_SMOKE_VARIANT_ID: "variant_smoke",
        },
      })
    ).resolves.toMatchObject({
      customer_id: "cus_smoke",
      customer_email: "batch12a@example.com",
      cart_id: "cart_smoke",
      order_id: "order_smoke",
      display_id: 1201,
      sales_channel_id: "sc_smoke",
      region_id: "reg_smoke",
      currency_code: "usd",
      variant_id: "variant_smoke",
      line_item_unit_price: 2250,
      payment_status: "pending",
      captured_amount: 0,
      fulfillment_status: "none",
      fulfillment_count: 0,
      store_id: "default_store",
      cancellation_allowed: true,
    })

    expect(mockCreateCartRun).toHaveBeenCalledTimes(1)
    expect(mockAddLineItemRun).toHaveBeenCalledTimes(1)
    expect(mockUpdateCartRun).toHaveBeenCalledWith({
      input: expect.objectContaining({
        id: "cart_smoke",
        customer_id: "cus_smoke",
        email: "batch12a@example.com",
      }),
    })
    expect(mockUpdateCartRun.mock.invocationCallOrder[0]).toBeLessThan(
      mockAddLineItemRun.mock.invocationCallOrder[0]
    )
    expect(mockEnsureCartPaymentReady).toHaveBeenCalledWith(
      container,
      "cart_smoke",
      "pp_system_default"
    )
    expect(mockCompleteCartRun).toHaveBeenCalledTimes(1)
    expect(mockSetOrderPostCompletePendingMetadata).toHaveBeenCalledWith(
      container,
      "order_smoke",
      "default_store"
    )
    expect(orderModule.updateOrders).toHaveBeenCalledWith(
      "order_smoke",
      expect.objectContaining({
        metadata: expect.objectContaining({
          batch12a_cancel_smoke: true,
          batch12a_smoke_cart_id: "cart_smoke",
          batch12a_smoke_variant_id: "variant_smoke",
          batch12a_smoke_sales_channel_id: "sc_smoke",
          batch12a_smoke_region_id: "reg_smoke",
          batch12a_smoke_currency_code: "usd",
          batch12a_smoke_line_item_unit_price: 2250,
        }),
      })
    )
    expect(mockMarkOrderPaidAndFulfillmentWaiting).not.toHaveBeenCalled()
  })

  it("does not update cart after line items are present", async () => {
    const { container } = makeContainer()

    await createBatch12aCancellationSmokeOrder({
      container,
      env: {
        NODE_ENV: "development",
        BATCH12A_CANCEL_SMOKE_ENABLED: "true",
        BATCH12A_CUSTOMER_EMAIL: "batch12a@example.com",
        BATCH12A_CANCEL_SMOKE_VARIANT_ID: "variant_smoke",
      },
    })

    expect(mockUpdateCartRun).toHaveBeenCalledTimes(1)
    expect(mockUpdateCartRun.mock.invocationCallOrder[0]).toBeLessThan(
      mockAddLineItemRun.mock.invocationCallOrder[0]
    )
  })

  it("reuses an existing eligible smoke order instead of creating another cart", async () => {
    const { container } = makeContainer({ existingOrders: [baseOrder] })

    await expect(
      createBatch12aCancellationSmokeOrder({
        container,
        env: {
          NODE_ENV: "development",
          BATCH12A_CANCEL_SMOKE_ENABLED: "true",
          BATCH12A_CUSTOMER_EMAIL: "batch12a@example.com",
        },
      })
    ).resolves.toMatchObject({ order_id: "order_smoke" })

    expect(mockCreateCartRun).not.toHaveBeenCalled()
    expect(mockCompleteCartRun).not.toHaveBeenCalled()
  })

  it("fails when the order has captured payment", async () => {
    const { container } = makeContainer({
      order: {
        ...baseOrder,
        payment_collections: [
          {
            id: "paycol_smoke",
            captured_amount: 100,
            payments: [{ id: "pay_smoke", captures: [{ id: "cap_smoke", amount: 100 }] }],
          },
        ],
      },
    })

    await expect(
      validateCancellationSmokeOrder(
        container,
        "order_smoke",
        { id: "cus_smoke", email: "batch12a@example.com" },
        "default_store"
      )
    ).rejects.toThrow("ORDER_PAYMENT_CAPTURED")
  })

  it("fails when fulfillment records exist", async () => {
    const { container } = makeContainer({
      customFulfillments: [{ id: "fulfillment_order_smoke", status: "waiting" }],
    })

    await expect(
      validateCancellationSmokeOrder(
        container,
        "order_smoke",
        { id: "cus_smoke", email: "batch12a@example.com" },
        "default_store"
      )
    ).rejects.toThrow("ORDER_HAS_FULFILLMENT")
  })

  it("fails when the order is in a paid state", async () => {
    const { container } = makeContainer({
      order: {
        ...baseOrder,
        metadata: {
          ...baseOrder.metadata,
          payment_status: "paid",
        },
      },
    })

    await expect(
      validateCancellationSmokeOrder(
        container,
        "order_smoke",
        { id: "cus_smoke", email: "batch12a@example.com" },
        "default_store"
      )
    ).rejects.toThrow("ORDER_ALREADY_PAID")
  })
})
