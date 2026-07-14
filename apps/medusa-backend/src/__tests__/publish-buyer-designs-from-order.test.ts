import { Modules } from "@medusajs/framework/utils"
import { STORE_CORE_MODULE } from "../modules/store-core"
import { publishBuyerDesignsFromOrder } from "../lib/publish-buyer-designs-from-order"

describe("publishBuyerDesignsFromOrder", () => {
  it("publishes draft buyer_design products from the order items", async () => {
    const updateProducts = jest.fn().mockResolvedValue([{ id: "prod_custom", status: "published" }])
    const storeCore = {
      listProducts: jest.fn().mockResolvedValue([
        {
          id: "prod_custom",
          store_id: "default_store",
          status: "draft",
          metadata: { buyer_design: true },
        },
      ]),
      updateProducts,
    }
    const orderModule = {
      retrieveOrder: jest.fn().mockResolvedValue({
        id: "order_1",
        items: [{ metadata: { mc_product_id: "prod_custom" } }],
      }),
    }
    const container = {
      resolve: (key: string) => {
        if (key === Modules.ORDER) return orderModule
        if (key === STORE_CORE_MODULE) return storeCore
        throw new Error(`unexpected ${key}`)
      },
    }

    const ids = await publishBuyerDesignsFromOrder(container as never, {
      orderId: "order_1",
      storeId: "default_store",
    })

    expect(ids).toEqual(["prod_custom"])
    expect(updateProducts).toHaveBeenCalledWith({
      selector: { id: "prod_custom", store_id: "default_store" },
      data: expect.objectContaining({
        status: "published",
        metadata: expect.objectContaining({
          buyer_design: true,
          published_from_order_id: "order_1",
        }),
      }),
    })
  })

  it("skips non-buyer catalog products", async () => {
    const updateProducts = jest.fn()
    const storeCore = {
      listProducts: jest.fn().mockResolvedValue([
        {
          id: "prod_seller",
          store_id: "default_store",
          status: "draft",
          metadata: {},
        },
      ]),
      updateProducts,
    }
    const orderModule = {
      retrieveOrder: jest.fn().mockResolvedValue({
        id: "order_1",
        items: [{ metadata: { mc_product_id: "prod_seller" } }],
      }),
    }
    const container = {
      resolve: (key: string) => {
        if (key === Modules.ORDER) return orderModule
        if (key === STORE_CORE_MODULE) return storeCore
        throw new Error(`unexpected ${key}`)
      },
    }

    const ids = await publishBuyerDesignsFromOrder(container as never, {
      orderId: "order_1",
      storeId: "default_store",
    })

    expect(ids).toEqual([])
    expect(updateProducts).not.toHaveBeenCalled()
  })
})
