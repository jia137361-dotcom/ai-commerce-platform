import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { randomBytes } from "node:crypto"
import { resolveCurrentStore } from "../../../../../lib/store-context"
import { assertOrderBelongsToCurrentStore, readOrderStoreId } from "../../../../../lib/order-store-context"
import { OrderStoreAccessError } from "../../../../../lib/order-store-error"
import {
  ORDER_META_FULFILLMENT_STATUS,
  ORDER_META_PAYMENT_STATUS,
  normalizeOrderMetadata,
} from "../../../../../lib/order-custom-metadata"
import { FULFILLMENT_ORDERS_MODULE } from "../../../../../modules/fulfillment-orders"
import type FulfillmentOrdersModuleService from "../../../../../modules/fulfillment-orders/service"

/**
 * PDF / 计划：订单已 paid 后 mock 推供应商，创建 fulfillment_order（pushed）。
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const orderId = req.params.order_id as string
    const storeId = resolveCurrentStore(req).store_id
    const body = (req.body || {}) as { supplier?: string; payload?: Record<string, unknown> }

    const orderModule = req.scope.resolve(Modules.ORDER)
    const order = await orderModule.retrieveOrder(orderId)
    assertOrderBelongsToCurrentStore(req, order)

    const paymentStatus = (order.metadata as Record<string, unknown> | null)?.[ORDER_META_PAYMENT_STATUS]
    if (paymentStatus !== "paid") {
      return res.status(400).json({ error: "Order must be paid before push-fulfillment" })
    }

    const foService = req.scope.resolve(FULFILLMENT_ORDERS_MODULE) as FulfillmentOrdersModuleService
    const existing = await foService.listFulfillmentOrders({ order_id: [orderId] })
    const supplier = typeof body.supplier === "string" && body.supplier.trim() ? body.supplier.trim() : "mock"
    const supplierOrderId = `MOCK-SUP-${randomBytes(4).toString("hex")}`
    const now = new Date()

    if (existing.length > 0) {
      const fo = existing[0]
      await foService.updateFulfillmentOrders({
        id: fo.id,
        status: "pushed",
        supplier,
        supplier_order_id: supplierOrderId,
        payload: body.payload ?? { note: "mock_push" },
        pushed_at: now,
        failed_reason: null,
      })
      const meta = {
        ...normalizeOrderMetadata(order.metadata as Record<string, unknown> | null),
        [ORDER_META_FULFILLMENT_STATUS]: "pushed",
      }
      await orderModule.updateOrders(orderId, { metadata: meta })
      const updated = await foService.retrieveFulfillmentOrder(fo.id)
      return res.status(200).json({ order_id: orderId, store_id: storeId, fulfillment_order: updated })
    }

    await foService.createFulfillmentOrders({
      order_id: orderId,
      store_id: readOrderStoreId(order),
      payment_collection_id: null,
      supplier,
      supplier_order_id: supplierOrderId,
      payload: body.payload ?? { note: "mock_push" },
      pushed_at: now,
      status: "pushed",
    })

    const meta = {
      ...normalizeOrderMetadata(order.metadata as Record<string, unknown> | null),
      [ORDER_META_FULFILLMENT_STATUS]: "pushed",
    }
    await orderModule.updateOrders(orderId, { metadata: meta })

    const rowsAfter = await foService.listFulfillmentOrders({ order_id: [orderId] })
    const row = rowsAfter[0]

    res.status(201).json({
      order_id: orderId,
      store_id: storeId,
      fulfillment_order: row,
    })
  } catch (error: unknown) {
    if (error instanceof OrderStoreAccessError) {
      return res.status(403).json({
        error: { code: error.code, message: error.message },
      })
    }
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("push-fulfillment 失败:", error)
    res.status(400).json({ error: message })
  }
}
