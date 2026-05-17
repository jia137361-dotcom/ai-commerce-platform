import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { resolveCurrentStore } from "../../../lib/store-context"
import { readOrderStoreId } from "../../../lib/order-store-context"
import {
  ORDER_META_PAYMENT_STATUS,
  readOrderFulfillmentStatusMeta,
  toMedusaAdminOrderFulfillmentStatus,
  toMedusaAdminOrderPaymentStatus,
} from "../../../lib/order-custom-metadata"
import { FULFILLMENT_ORDERS_MODULE } from "../../../modules/fulfillment-orders"
import type FulfillmentOrdersModuleService from "../../../modules/fulfillment-orders/service"
import { SHIPMENTS_MODULE } from "../../../modules/shipments"
import type ShipmentsModuleService from "../../../modules/shipments/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const storeId = resolveCurrentStore(req).store_id
    const take = Math.min(Number(req.query?.limit ?? 50) || 50, 200)

    const orderModule = req.scope.resolve(Modules.ORDER)
    const foService = req.scope.resolve(FULFILLMENT_ORDERS_MODULE) as FulfillmentOrdersModuleService
    const shipmentService = req.scope.resolve(SHIPMENTS_MODULE) as ShipmentsModuleService

    const orders = await orderModule.listOrders(
      {},
      { take, order: { created_at: "DESC" } }
    )

    const scoped = orders.filter((o) => readOrderStoreId(o) === storeId)

    const enriched = await Promise.all(
      scoped.map(async (o) => {
        const fos = await foService.listFulfillmentOrders({ order_id: [o.id] })
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

        const mcFulfillment = readOrderFulfillmentStatusMeta(
          o.metadata as Record<string, unknown> | null
        )
        const meta = o.metadata as Record<string, unknown> | null
        const mcPayment = meta?.[ORDER_META_PAYMENT_STATUS] ?? null

        return {
          id: o.id,
          display_id: o.display_id,
          email: o.email,
          created_at: o.created_at,
          currency_code: o.currency_code,
          payment_status: toMedusaAdminOrderPaymentStatus(mcPayment),
          mc_payment_status: mcPayment ?? null,
          fulfillment_status: toMedusaAdminOrderFulfillmentStatus(mcFulfillment),
          mc_fulfillment_status: mcFulfillment ?? null,
          fulfillment_order: fo,
          latest_shipment: latestShipment,
        }
      })
    )

    res.status(200).json({
      store_id: storeId,
      count: enriched.length,
      orders: enriched,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("Admin 订单列表失败:", error)
    res.status(400).json({ error: message })
  }
}
