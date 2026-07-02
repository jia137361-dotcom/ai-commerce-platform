import { Modules } from "@medusajs/framework/utils"
import { setOrderPostCompletePendingMetadata } from "../lib/sync-order-paid-fulfillment"

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
