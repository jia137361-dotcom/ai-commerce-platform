import { Modules } from "@medusajs/framework/utils"
import {
  markOrderPaidAndFulfillmentWaiting,
  seedFulfillmentOrderIfMissing,
  setOrderPostCompletePendingMetadata,
  syncPaidIfPaymentAlreadyCaptured,
} from "../lib/sync-order-paid-fulfillment"
import { FULFILLMENT_ORDERS_MODULE } from "../modules/fulfillment-orders"
import { createPendingReferralCommission } from "../lib/referral-program"

jest.mock("../lib/referral-program", () => ({
  createPendingReferralCommission: jest.fn(),
}))

const mockCreatePendingReferralCommission = createPendingReferralCommission as jest.MockedFunction<typeof createPendingReferralCommission>

describe("setOrderPostCompletePendingMetadata", () => {
  it("merges store_id into order metadata without dropping existing fields", async () => {
    const orderModule = {
      retrieveOrder: jest.fn(async () => ({
        id: "order_1",
        metadata: {
          existing_key: "kept",
          payment_status: "paid",
        },
      })),
      updateOrders: jest.fn(),
    }
    const container = {
      resolve: jest.fn((key: string) => {
        if (key === Modules.ORDER) return orderModule
        throw new Error(`Unexpected dependency: ${key}`)
      }),
    }

    await setOrderPostCompletePendingMetadata(container as never, "order_1", "default_store")

    expect(orderModule.updateOrders).toHaveBeenCalledWith("order_1", {
      metadata: {
        existing_key: "kept",
        store_id: "default_store",
        payment_status: "pending",
        mc_fulfillment_status: "none",
      },
    })
  })
})

describe("fulfillment order payment closure helpers", () => {
  beforeEach(() => {
    mockCreatePendingReferralCommission.mockReset()
    mockCreatePendingReferralCommission.mockResolvedValue({ commission: null, idempotent: false })
  })

  it("creates a pending referral commission when payment capture is recovered after the event race", async () => {
    const paymentModule = {
      listPayments: jest.fn(async () => [{ captured_at: new Date(), captures: [] }]),
    }
    const orderModule = {
      retrieveOrder: jest.fn(async () => ({ id: "order_1", metadata: {} })),
      updateOrders: jest.fn(),
    }
    const foService = {
      listFulfillmentOrders: jest.fn(async () => [{ id: "fo_1", status: "pending_capture" }]),
      updateFulfillmentOrders: jest.fn(),
    }
    const container = {
      resolve: jest.fn((key: string) => {
        if (key === Modules.PAYMENT) return paymentModule
        if (key === Modules.ORDER) return orderModule
        if (key === FULFILLMENT_ORDERS_MODULE) return foService
        throw new Error(`Unexpected dependency: ${key}`)
      }),
    }

    await expect(syncPaidIfPaymentAlreadyCaptured(container as never, "order_1", "paycol_1")).resolves.toBe(true)

    expect(mockCreatePendingReferralCommission).toHaveBeenCalledWith(container, "order_1")
  })

  it("creates exactly one fulfillment order when payment collection exists and none is seeded", async () => {
    const foService = {
      listFulfillmentOrders: jest.fn(async () => []),
      createFulfillmentOrders: jest.fn(async () => ({ id: "fo_1" })),
    }
    const container = {
      resolve: jest.fn((key: string) => {
        if (key === FULFILLMENT_ORDERS_MODULE) return foService
        throw new Error(`Unexpected dependency: ${key}`)
      }),
    }

    await seedFulfillmentOrderIfMissing(container as never, {
      orderId: "order_1",
      storeId: "default_store",
      paymentCollectionId: "paycol_1",
    })

    expect(foService.createFulfillmentOrders).toHaveBeenCalledTimes(1)
    expect(foService.createFulfillmentOrders).toHaveBeenCalledWith({
      order_id: "order_1",
      store_id: "default_store",
      payment_collection_id: "paycol_1",
      supplier: "mock",
      status: "pending_capture",
    })
  })

  it("fails closed when an order already has multiple fulfillment orders", async () => {
    const foService = {
      listFulfillmentOrders: jest.fn(async () => [{ id: "fo_1" }, { id: "fo_2" }]),
      createFulfillmentOrders: jest.fn(),
    }
    const container = {
      resolve: jest.fn((key: string) => {
        if (key === FULFILLMENT_ORDERS_MODULE) return foService
        throw new Error(`Unexpected dependency: ${key}`)
      }),
    }

    await expect(seedFulfillmentOrderIfMissing(container as never, {
      orderId: "order_1",
      storeId: "default_store",
      paymentCollectionId: "paycol_1",
    })).rejects.toThrow("Order order_1 has multiple fulfillment orders: fo_1, fo_2")
    expect(foService.createFulfillmentOrders).not.toHaveBeenCalled()
  })

  it("repairs pending_capture fulfillment status when a paid-order sync retries", async () => {
    const orderModule = {
      retrieveOrder: jest.fn(async () => ({
        id: "order_1",
        metadata: {
          payment_status: "paid",
          mc_fulfillment_status: "waiting",
        },
      })),
      updateOrders: jest.fn(),
    }
    const foService = {
      listFulfillmentOrders: jest.fn(async () => [{ id: "fo_1", status: "pending_capture" }]),
      updateFulfillmentOrders: jest.fn(),
    }
    const container = {
      resolve: jest.fn((key: string) => {
        if (key === Modules.ORDER) return orderModule
        if (key === FULFILLMENT_ORDERS_MODULE) return foService
        throw new Error(`Unexpected dependency: ${key}`)
      }),
    }

    await markOrderPaidAndFulfillmentWaiting(container as never, "order_1", "payment.captured_event")

    expect(orderModule.updateOrders).not.toHaveBeenCalled()
    expect(foService.updateFulfillmentOrders).toHaveBeenCalledWith({
      id: "fo_1",
      status: "waiting",
    })
  })

  it.each(["canceled", "failed", "pushed", "in_production", "shipped", "delivered"])(
    "does not move %s fulfillment records back to waiting",
    async (status) => {
      const orderModule = {
        retrieveOrder: jest.fn(async () => ({
          id: "order_1",
          metadata: {
            payment_status: "paid",
            mc_fulfillment_status: status,
          },
        })),
        updateOrders: jest.fn(),
      }
      const foService = {
        listFulfillmentOrders: jest.fn(async () => [{ id: "fo_1", status }]),
        updateFulfillmentOrders: jest.fn(),
      }
      const container = {
        resolve: jest.fn((key: string) => {
          if (key === Modules.ORDER) return orderModule
          if (key === FULFILLMENT_ORDERS_MODULE) return foService
          throw new Error(`Unexpected dependency: ${key}`)
        }),
      }

      await markOrderPaidAndFulfillmentWaiting(container as never, "order_1", "payment.captured_event")

      expect(orderModule.updateOrders).not.toHaveBeenCalled()
      expect(foService.updateFulfillmentOrders).not.toHaveBeenCalled()
    }
  )
})
