import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { resolveCurrentStore } from "../../../../lib/store-context"
import { assertOrderBelongsToCurrentStore } from "../../../../lib/order-store-context"
import { OrderStoreAccessError } from "../../../../lib/order-store-error"
import {
  ORDER_META_PAYMENT_STATUS,
  readOrderFulfillmentStatusMeta,
  toMedusaAdminOrderFulfillmentStatus,
  toMedusaAdminOrderPaymentStatus,
} from "../../../../lib/order-custom-metadata"
import { normalizeOrderLineItem } from "../../../../lib/admin-orders"
import { getStoreCoreService, sendError } from "../../../_helpers/store-core"
import { FULFILLMENT_ORDERS_MODULE } from "../../../../modules/fulfillment-orders"
import type FulfillmentOrdersModuleService from "../../../../modules/fulfillment-orders/service"
import { SHIPMENTS_MODULE } from "../../../../modules/shipments"
import type ShipmentsModuleService from "../../../../modules/shipments/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const orderId = req.params.order_id as string
    const storeId = resolveCurrentStore(req).store_id

    const orderModule = req.scope.resolve(Modules.ORDER)
    const foService = req.scope.resolve(FULFILLMENT_ORDERS_MODULE) as FulfillmentOrdersModuleService
    const shipmentService = req.scope.resolve(SHIPMENTS_MODULE) as ShipmentsModuleService
    const storeCore = getStoreCoreService(req)

    const order = await orderModule.retrieveOrder(orderId, {
      relations: ["items", "shipping_address"],
    })
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

    const supplierRows = await storeCore.listSupplierOrders({ order_id: [orderId] })
    const supplierOrder = supplierRows[0] ?? null

    const meta = order.metadata as Record<string, unknown> | null
    const mcPayment = meta?.[ORDER_META_PAYMENT_STATUS] ?? null
    const mcFulfillment = readOrderFulfillmentStatusMeta(meta)

    const items = (order.items ?? []).map((item) =>
      normalizeOrderLineItem(item as unknown as Record<string, unknown>)
    )

    return res.json({
      order_id: order.id,
      store_id: storeId,
      display_id: order.display_id,
      email: order.email,
      created_at: order.created_at,
      currency_code: order.currency_code,
      payment_status: toMedusaAdminOrderPaymentStatus(mcPayment),
      mc_payment_status: mcPayment ?? null,
      fulfillment_status: toMedusaAdminOrderFulfillmentStatus(mcFulfillment),
      mc_fulfillment_status: mcFulfillment ?? null,
      shipping_address: order.shipping_address ?? null,
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
