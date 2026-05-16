import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { randomBytes } from "node:crypto"
import { resolveCurrentStore } from "../../../../../lib/store-context"
import { ORDER_META_FULFILLMENT_STATUS } from "../../../../../lib/order-custom-metadata"
import { FULFILLMENT_ORDERS_MODULE } from "../../../../../modules/fulfillment-orders"
import type FulfillmentOrdersModuleService from "../../../../../modules/fulfillment-orders/service"
import { SHIPMENTS_MODULE } from "../../../../../modules/shipments"
import type ShipmentsModuleService from "../../../../../modules/shipments/service"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const foId = req.params.id as string
    const storeId = resolveCurrentStore(req).store_id
    const body = (req.body || {}) as { carrier?: string; tracking_number?: string }

    const foService = req.scope.resolve(FULFILLMENT_ORDERS_MODULE) as FulfillmentOrdersModuleService
    const shipmentService = req.scope.resolve(SHIPMENTS_MODULE) as ShipmentsModuleService
    const orderModule = req.scope.resolve(Modules.ORDER)

    const fo = await foService.retrieveFulfillmentOrder(foId)
    if (fo.store_id !== storeId) {
      return res.status(403).json({ error: "Fulfillment order does not belong to current store" })
    }

    const tracking =
      typeof body.tracking_number === "string" && body.tracking_number.trim().length > 0
        ? body.tracking_number.trim()
        : `MOCK-${randomBytes(6).toString("hex")}`

    const carrier =
      typeof body.carrier === "string" && body.carrier.trim().length > 0
        ? body.carrier.trim()
        : "mock_carrier"

    const shipment = await shipmentService.createShipments({
      store_id: fo.store_id,
      order_id: fo.order_id,
      fulfillment_order_id: fo.id,
      carrier,
      tracking_number: tracking,
      tracking_url: `https://track.mock.example/${encodeURIComponent(tracking)}`,
      shipped_at: new Date(),
      status: "shipped",
    })

    await foService.updateFulfillmentOrders({
      id: fo.id,
      status: "fulfilled",
    })

    const order = await orderModule.retrieveOrder(fo.order_id)
    const meta = { ...(order.metadata ?? {}), [ORDER_META_FULFILLMENT_STATUS]: "shipped" }
    await orderModule.updateOrders(fo.order_id, { metadata: meta })

    res.status(200).json({
      fulfillment_order_id: fo.id,
      order_id: fo.order_id,
      shipment,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("Mock 发货失败:", error)
    res.status(400).json({ error: message })
  }
}
