import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { getStoreCoreService, sendError } from "../../../../_helpers/store-core"
import { assertOrderBelongsToCurrentStore } from "../../../../../lib/order-store-context"
import { OrderStoreAccessError } from "../../../../../lib/order-store-error"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const orderId = req.params.order_id as string
    const orderModule = req.scope.resolve(Modules.ORDER)
    const order = await orderModule.retrieveOrder(orderId)
    assertOrderBelongsToCurrentStore(req, order)

    const storeCore = getStoreCoreService(req)
    const rows = await storeCore.listSupplierOrders({ order_id: [orderId] })
    const items =
      rows.length > 0
        ? await storeCore.listSupplierOrderItems({ supplier_order_id: rows[0].id })
        : []

    return res.json({
      order_id: orderId,
      supplier_orders: rows,
      supplier_order_items: items,
    })
  } catch (error: unknown) {
    if (error instanceof OrderStoreAccessError) {
      return res.status(403).json({ error: { code: error.code, message: error.message } })
    }
    const message = error instanceof Error ? error.message : "Unknown error"
    return sendError(res, 400, "VALIDATION_ERROR", message)
  }
}
