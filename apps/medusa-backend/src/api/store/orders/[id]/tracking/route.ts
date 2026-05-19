import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { assertOrderBelongsToCurrentStore, readOrderStoreId } from "../../../../../lib/order-store-context"
import { OrderStoreAccessError } from "../../../../../lib/order-store-error"
import {
  ORDER_META_PAYMENT_STATUS,
  readOrderFulfillmentStatusMeta,
} from "../../../../../lib/order-custom-metadata"
import { FULFILLMENT_ORDERS_MODULE } from "../../../../../modules/fulfillment-orders"
import type FulfillmentOrdersModuleService from "../../../../../modules/fulfillment-orders/service"
import { SHIPMENTS_MODULE } from "../../../../../modules/shipments"
import type ShipmentsModuleService from "../../../../../modules/shipments/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const orderId = req.params.id as string
    const email = (req.query?.email as string | undefined)?.trim().toLowerCase()
    if (!email) {
      return res.status(400).json({ error: "email query parameter is required" })
    }

    const orderModule = req.scope.resolve(Modules.ORDER)
    const order = await orderModule.retrieveOrder(orderId)

    assertOrderBelongsToCurrentStore(req, order)

    if (!order.email || order.email.trim().toLowerCase() !== email) {
      return res.status(403).json({ error: "Email does not match order" })
    }

    const foService = req.scope.resolve(FULFILLMENT_ORDERS_MODULE) as FulfillmentOrdersModuleService
    const shipmentService = req.scope.resolve(SHIPMENTS_MODULE) as ShipmentsModuleService

    const fos = await foService.listFulfillmentOrders({ order_id: [orderId] })
    const fo = fos[0] ?? null

    const shipments = fo
      ? await shipmentService.listShipments({ fulfillment_order_id: [fo.id] })
      : []

    res.status(200).json({
      order_id: order.id,
      store_id: readOrderStoreId(order),
      payment_status: (order.metadata as Record<string, unknown> | null)?.[ORDER_META_PAYMENT_STATUS] ?? null,
      fulfillment_status: readOrderFulfillmentStatusMeta(order.metadata as Record<string, unknown> | null),
      fulfillment_order: fo,
      shipments,
    })
  } catch (error: unknown) {
    if (error instanceof OrderStoreAccessError) {
      return res.status(403).json({
        error: { code: error.code, message: error.message },
      })
    }
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("订单 tracking 失败:", error)
    res.status(400).json({ error: message })
  }
}
