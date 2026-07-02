import { Modules } from "@medusajs/framework/utils"
import { POST } from "../api/admin/orders/[order_id]/mock-delivered/route"
import { FULFILLMENT_ORDERS_MODULE } from "../modules/fulfillment-orders"
import { SHIPMENTS_MODULE } from "../modules/shipments"

const makeResponse = () => {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(body: unknown) {
      this.body = body
      return this
    },
  }
  return res
}

const makeRequest = (shipment: Record<string, unknown>) => {
  const updateOrders = jest.fn(async () => undefined)
  const updateShipments = jest.fn(async (input) => input)
  const services = {
    [Modules.ORDER]: {
      retrieveOrder: jest.fn(async () => ({
        id: "order_1",
        metadata: { store_id: "default_store", mc_fulfillment_status: "shipped" },
      })),
      updateOrders,
    },
    [FULFILLMENT_ORDERS_MODULE]: {
      listFulfillmentOrders: jest.fn(async () => [{ id: "fo_1" }]),
    },
    [SHIPMENTS_MODULE]: {
      listShipments: jest.fn(async () => [shipment]),
      updateShipments,
    },
  }
  return {
    req: {
      params: { order_id: "order_1" },
      headers: { "x-store-id": "default_store" },
      scope: { resolve: (key: string) => services[key as keyof typeof services] },
    },
    updateOrders,
    updateShipments,
  }
}

describe("POST /admin/orders/:id/mock-delivered", () => {
  it("is unavailable in production", async () => {
    const previous = process.env.NODE_ENV
    process.env.NODE_ENV = "production"
    const res = makeResponse()
    try {
      await POST({} as never, res as never)
    } finally {
      process.env.NODE_ENV = previous
    }
    expect(res.statusCode).toBe(404)
    expect(res.body).toEqual({
      error: expect.objectContaining({ code: "MOCK_DELIVERED_UNAVAILABLE" }),
    })
  })

  it("transitions a shipped mock shipment to delivered with explicit evidence", async () => {
    const { req, updateOrders, updateShipments } = makeRequest({
      id: "shipment_1",
      status: "shipped",
      shipped_at: new Date("2026-06-21T10:00:00.000Z"),
    })
    const res = makeResponse()

    await POST(req as never, res as never)

    expect(res.statusCode).toBe(200)
    expect(updateShipments).toHaveBeenCalledWith({
      id: "shipment_1",
      status: "delivered",
      delivered_at: expect.any(Date),
    })
    expect(updateOrders).toHaveBeenCalledWith(
      "order_1",
      expect.objectContaining({
        metadata: expect.objectContaining({
          mc_fulfillment_status: "delivered",
          mock_delivery_evidence: true,
          mock_delivered_at: expect.any(String),
        }),
      })
    )
    expect(res.body).toEqual(expect.objectContaining({ mock: true, delivered_at: expect.any(String) }))
  })

  it("rejects delivery before shipped evidence exists", async () => {
    const { req, updateOrders, updateShipments } = makeRequest({
      id: "shipment_1",
      status: "pending",
      shipped_at: null,
    })
    const res = makeResponse()

    await POST(req as never, res as never)

    expect(res.statusCode).toBe(400)
    expect(res.body).toEqual({
      error: expect.objectContaining({ code: "MOCK_DELIVERED_REQUIRES_SHIPPED" }),
    })
    expect(updateShipments).not.toHaveBeenCalled()
    expect(updateOrders).not.toHaveBeenCalled()
  })
})
