import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { resolveCurrentStore } from "../../../../../lib/store-context"
import {
  assertOrderBelongsToCurrentStore,
} from "../../../../../lib/order-store-context"
import { OrderStoreAccessError } from "../../../../../lib/order-store-error"
import {
  ORDER_META_FULFILLMENT_STATUS,
  normalizeOrderMetadata,
} from "../../../../../lib/order-custom-metadata"
import { FULFILLMENT_ORDERS_MODULE } from "../../../../../modules/fulfillment-orders"
import type FulfillmentOrdersModuleService from "../../../../../modules/fulfillment-orders/service"
import { SHIPMENTS_MODULE } from "../../../../../modules/shipments"
import type ShipmentsModuleService from "../../../../../modules/shipments/service"

const mockDeliveredEnabled = () =>
  process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  if (!mockDeliveredEnabled()) {
    return res.status(404).json({
      error: {
        code: "MOCK_DELIVERED_UNAVAILABLE",
        message: "Mock Delivered is available only in local development or test mode.",
      },
    })
  }

  try {
    const orderId = req.params.order_id as string
    const storeId = resolveCurrentStore(req).store_id
    const orderModule = req.scope.resolve(Modules.ORDER)
    const order = await orderModule.retrieveOrder(orderId)
    assertOrderBelongsToCurrentStore(req, order)

    const foService = req.scope.resolve(
      FULFILLMENT_ORDERS_MODULE
    ) as FulfillmentOrdersModuleService
    const shipmentService = req.scope.resolve(SHIPMENTS_MODULE) as ShipmentsModuleService
    const fulfillmentOrders = await foService.listFulfillmentOrders({ order_id: [orderId] })
    if (!fulfillmentOrders.length) {
      return res.status(400).json({ error: "No fulfillment order exists for this order." })
    }

    const shipments = await shipmentService.listShipments({
      fulfillment_order_id: [fulfillmentOrders[0].id],
    })
    const shipped = [...shipments]
      .filter((shipment) => shipment.status === "shipped" && shipment.shipped_at)
      .sort((left, right) =>
        new Date(right.shipped_at as Date | string).getTime() -
        new Date(left.shipped_at as Date | string).getTime()
      )[0]

    if (!shipped) {
      return res.status(400).json({
        error: {
          code: "MOCK_DELIVERED_REQUIRES_SHIPPED",
          message: "Mock Delivered is available only after a mock shipment has been recorded.",
        },
      })
    }

    const deliveredAt = new Date()
    const shipment = await shipmentService.updateShipments({
      id: shipped.id,
      status: "delivered",
      delivered_at: deliveredAt,
    })
    const metadata = {
      ...normalizeOrderMetadata(order.metadata as Record<string, unknown> | null),
      [ORDER_META_FULFILLMENT_STATUS]: "delivered",
      mock_delivered_at: deliveredAt.toISOString(),
      mock_delivery_evidence: true,
    }
    await orderModule.updateOrders(orderId, { metadata })

    return res.status(200).json({
      order_id: orderId,
      store_id: storeId,
      fulfillment_order_id: fulfillmentOrders[0].id,
      mock: true,
      delivered_at: deliveredAt.toISOString(),
      shipment,
    })
  } catch (error: unknown) {
    if (error instanceof OrderStoreAccessError) {
      return res.status(403).json({ error: { code: error.code, message: error.message } })
    }
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("mock-delivered failed:", error)
    return res.status(400).json({ error: message })
  }
}
