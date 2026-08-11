import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../../lib/store-context"
import { assertOrderBelongsToCurrentStore } from "../../../../lib/order-store-context"
import { OrderStoreAccessError } from "../../../../lib/order-store-error"
import {
  loadAdminOrderRecord,
  normalizeOrderLineItem,
  serializeAdminOrderSummary,
} from "../../../../lib/admin-orders"
import { getStoreCoreService, sendError } from "../../../_helpers/store-core"
import { FULFILLMENT_ORDERS_MODULE } from "../../../../modules/fulfillment-orders"
import type FulfillmentOrdersModuleService from "../../../../modules/fulfillment-orders/service"
import { SHIPMENTS_MODULE } from "../../../../modules/shipments"
import type ShipmentsModuleService from "../../../../modules/shipments/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const orderId = req.params.order_id as string
    const storeId = resolveCurrentStore(req).store_id

    const foService = req.scope.resolve(FULFILLMENT_ORDERS_MODULE) as FulfillmentOrdersModuleService
    const shipmentService = req.scope.resolve(SHIPMENTS_MODULE) as ShipmentsModuleService
    const storeCore = getStoreCoreService(req)

    const order = await loadAdminOrderRecord(req.scope, orderId)
    assertOrderBelongsToCurrentStore(req, order)

    const fos = await foService.listFulfillmentOrders({ order_id: [orderId] })
    const fo = fos[0] ?? null
    const shipments = fo
      ? await shipmentService.listShipments({ fulfillment_order_id: [fo.id] })
      : []
    const latestShipment =
      shipments.length > 0
        ? [...shipments].sort((a, b) => {
            const ta = a.shipped_at ? new Date(a.shipped_at as Date | string).getTime() : 0
            const tb = b.shipped_at ? new Date(b.shipped_at as Date | string).getTime() : 0
            return tb - ta
          })[0]
        : null

    let supplierOrder: Record<string, unknown> | null = null
    try {
      const supplierRows = await storeCore.listSupplierOrders({ order_id: [orderId] })
      supplierOrder = (supplierRows[0] as Record<string, unknown> | undefined) ?? null
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[admin-order-detail] supplier order lookup failed", {
          order_id: orderId,
          message: error instanceof Error ? error.message : String(error),
        })
      }
    }

    const summary = serializeAdminOrderSummary({
      order,
      fulfillmentOrder: fo as Record<string, unknown> | null,
      supplierOrder,
    })

    const items = (Array.isArray(order.items) ? order.items : []).map((item) =>
      normalizeOrderLineItem(item as unknown as Record<string, unknown>)
    )

    return res.json({
      ...summary,
      store_id: storeId,
      created_at: order.created_at,
      currency_code: order.currency_code,
      items,
      fulfillment_order: fo,
      latest_shipment: latestShipment,
      supplier_order: supplierOrder
        ? {
            id: supplierOrder.id,
            supplier_id: supplierOrder.supplier_id,
            supplier_order_id: supplierOrder.supplier_order_id,
            third_order_id: supplierOrder.third_order_id,
            supplier_status: supplierOrder.supplier_status,
          }
        : null,
    })
  } catch (error: unknown) {
    if (error instanceof OrderStoreAccessError) {
      return res.status(403).json({ error: { code: error.code, message: error.message } })
    }
    const message = error instanceof Error ? error.message : "Unknown error"
    return sendError(res, 400, "VALIDATION_ERROR", message)
  }
}
