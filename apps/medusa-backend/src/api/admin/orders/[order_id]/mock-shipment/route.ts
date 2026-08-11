import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { randomBytes } from "node:crypto"
import { resolveCurrentStore } from "../../../../../lib/store-context"
import { assertOrderBelongsToCurrentStore, readOrderStoreId } from "../../../../../lib/order-store-context"
import { OrderStoreAccessError } from "../../../../../lib/order-store-error"
import { ORDER_META_FULFILLMENT_STATUS, normalizeOrderMetadata } from "../../../../../lib/order-custom-metadata"
import { FULFILLMENT_ORDERS_MODULE } from "../../../../../modules/fulfillment-orders"
import type FulfillmentOrdersModuleService from "../../../../../modules/fulfillment-orders/service"
import { SHIPMENTS_MODULE } from "../../../../../modules/shipments"
import type ShipmentsModuleService from "../../../../../modules/shipments/service"
import { sendShippingNotification } from "../../../../../lib/email"
import { STORE_CORE_MODULE } from "../../../../../modules/store-core"
import type StoreCoreModuleService from "../../../../../modules/store-core/service"
import { getS2bdiyConfig, isS2bdiyEnabled } from "../../../../../modules/suppliers/s2bdiy/config"
import { S2bdiyClient } from "../../../../../modules/suppliers/s2bdiy/s2bdiy-client"
import { submitOrderLogisticsClient } from "../../../../../modules/suppliers/s2bdiy/s2bdiy-logistics"

/**
 * 计划：mock 物流回写 — 创建 shipment，订单 fulfillment_status → shipped。
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const orderId = req.params.order_id as string
    const storeId = resolveCurrentStore(req).store_id
    const body = (req.body || {}) as {
      carrier?: string
      tracking_number?: string
      tracking_url?: string
    }

    const orderModule = req.scope.resolve(Modules.ORDER)
    const order = await orderModule.retrieveOrder(orderId)
    assertOrderBelongsToCurrentStore(req, order)

    const foService = req.scope.resolve(FULFILLMENT_ORDERS_MODULE) as FulfillmentOrdersModuleService
    const shipmentService = req.scope.resolve(SHIPMENTS_MODULE) as ShipmentsModuleService

    const fos = await foService.listFulfillmentOrders({ order_id: [orderId] })
    if (fos.length === 0) {
      return res.status(400).json({ error: "No fulfillment_order for this order; call push-fulfillment first" })
    }
    const fo = fos[0]

    const tracking =
      typeof body.tracking_number === "string" && body.tracking_number.trim().length > 0
        ? body.tracking_number.trim()
        : `MOCK-${randomBytes(6).toString("hex")}`

    const carrier =
      typeof body.carrier === "string" && body.carrier.trim().length > 0
        ? body.carrier.trim()
        : "mock_carrier"

    const trackingUrl =
      typeof body.tracking_url === "string" && body.tracking_url.trim().length > 0
        ? body.tracking_url.trim()
        : `https://track.mock.example/${encodeURIComponent(tracking)}`

    const now = new Date()

    const shipment = await shipmentService.createShipments({
      store_id: readOrderStoreId(order),
      order_id: orderId,
      fulfillment_order_id: fo.id,
      carrier,
      tracking_number: tracking,
      tracking_url: trackingUrl,
      shipped_at: now,
      status: "shipped",
    })

    await foService.updateFulfillmentOrders({
      id: fo.id,
      status: "fulfilled",
    })

    const meta = {
      ...normalizeOrderMetadata(order.metadata as Record<string, unknown> | null),
      [ORDER_META_FULFILLMENT_STATUS]: "shipped",
    }
    await orderModule.updateOrders(orderId, { metadata: meta })

    if (typeof order.email === "string" && order.email.includes("@")) {
      await sendShippingNotification({
        to: order.email,
        orderId,
        displayId: typeof order.display_id === "number" ? order.display_id : null,
        trackingNumber: tracking,
        carrier,
        trackingUrl,
      })
    }

    if (isS2bdiyEnabled()) {
      try {
        const storeCore = req.scope.resolve(STORE_CORE_MODULE) as StoreCoreModuleService
        const supplierOrders = await storeCore.listSupplierOrders({ order_id: [orderId] })
        const supplierOrder = supplierOrders.find((r) => r.supplier_order_id)
        if (supplierOrder?.supplier_order_id) {
          const config = getS2bdiyConfig()
          if (config) {
            const client = new S2bdiyClient(config)
            await submitOrderLogisticsClient(client, {
              order_id: supplierOrder.supplier_order_id,
              logistics_platform_id: Number(supplierOrder.logistics_id ?? 1),
              logistics_no: tracking,
              logistics_company: carrier,
            })
            console.info("[mock-shipment] S2BDIY logistics submitted for order:", supplierOrder.supplier_order_id)
          }
        }
      } catch (error) {
        console.error("[mock-shipment] S2BDIY logistics submit failed (non-blocking):", error)
      }
    }

    res.status(200).json({
      order_id: orderId,
      store_id: storeId,
      fulfillment_order_id: fo.id,
      shipment,
    })
  } catch (error: unknown) {
    if (error instanceof OrderStoreAccessError) {
      return res.status(403).json({
        error: { code: error.code, message: error.message },
      })
    }
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("mock-shipment 失败:", error)
    res.status(400).json({ error: message })
  }
}
