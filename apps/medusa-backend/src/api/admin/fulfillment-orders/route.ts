import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../lib/store-context"
import { FULFILLMENT_ORDERS_MODULE } from "../../../modules/fulfillment-orders"
import type FulfillmentOrdersModuleService from "../../../modules/fulfillment-orders/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const storeId = resolveCurrentStore(req).store_id
    const foService = req.scope.resolve(FULFILLMENT_ORDERS_MODULE) as FulfillmentOrdersModuleService
    const rows = await foService.listFulfillmentOrders({ store_id: [storeId] })
    res.status(200).json({ store_id: storeId, fulfillment_orders: rows })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("Admin 履约单列表失败:", error)
    res.status(400).json({ error: message })
  }
}
