import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { resolveCurrentStore } from "../../../../../lib/store-context"
import { assertOrderBelongsToCurrentStore } from "../../../../../lib/order-store-context"
import { OrderStoreAccessError } from "../../../../../lib/order-store-error"
import { readOrderFulfillmentStatusMeta } from "../../../../../lib/order-custom-metadata"
import { buildFulfillmentTimeline } from "../../../../../lib/admin-orders"
import { sendError } from "../../../../_helpers/store-core"
import { FULFILLMENT_ORDERS_MODULE } from "../../../../../modules/fulfillment-orders"
import type FulfillmentOrdersModuleService from "../../../../../modules/fulfillment-orders/service"
import { SHIPMENTS_MODULE } from "../../../../../modules/shipments"
import type ShipmentsModuleService from "../../../../../modules/shipments/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const orderId = req.params.order_id as string
    const storeId = resolveCurrentStore(req).store_id

    const orderModule = req.scope.resolve(Modules.ORDER)
    const foService = req.scope.resolve(FULFILLMENT_ORDERS_MODULE) as FulfillmentOrdersModuleService
    const shipmentService = req.scope.resolve(SHIPMENTS_MODULE) as ShipmentsModuleService

    const order = await orderModule.retrieveOrder(orderId)
    assertOrderBelongsToCurrentStore(req, order)

    const fos = await foService.listFulfillmentOrders({ order_id: [orderId] })
    const fo = (fos[0] ?? null) as Record<string, unknown> | null
    const shipments = fo
      ? await shipmentService.listShipments({ fulfillment_order_id: [fo.id as string] })
      : []
    const latestShipment =
      shipments.length > 0
        ? ([...shipments].sort((a, b) => {
            const ta = a.shipped_at ? new Date(a.shipped_at as Date | string).getTime() : 0
            const tb = b.shipped_at ? new Date(b.shipped_at as Date | string).getTime() : 0
            return tb - ta
          })[0] as Record<string, unknown>)
        : null

    const mcFulfillment = readOrderFulfillmentStatusMeta(
      order.metadata as Record<string, unknown> | null
    ) as string | null

    const steps = buildFulfillmentTimeline({
      mcFulfillmentStatus: mcFulfillment,
      fulfillmentOrder: fo,
      latestShipment,
      orderCreatedAt: order.created_at as string | Date,
    })

    return res.json({
      order_id: orderId,
      store_id: storeId,
      mc_fulfillment_status: mcFulfillment,
      fulfillment_order: fo,
      latest_shipment: latestShipment,
      steps,
    })
  } catch (error: unknown) {
    if (error instanceof OrderStoreAccessError) {
      return res.status(403).json({ error: { code: error.code, message: error.message } })
    }
    const message = error instanceof Error ? error.message : "Unknown error"
    return sendError(res, 400, "VALIDATION_ERROR", message)
  }
}
