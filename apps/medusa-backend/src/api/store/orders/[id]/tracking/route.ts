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
import { STORE_CORE_MODULE } from "../../../../../modules/store-core"
import type StoreCoreModuleService from "../../../../../modules/store-core/service"
import { normalizeSupplierOrderTracking } from "../../../../../lib/supplier-order-tracking"

type TrackingOrder = {
  customer_id?: string | null
  email?: string | null
}

type AuthenticatedRequest = MedusaRequest & {
  auth_context?: {
    actor_id?: string
  }
}

const normalizeEmail = (email?: string) => email?.trim().toLowerCase() ?? ""

const readAuthCustomerId = (req: MedusaRequest) =>
  (req as AuthenticatedRequest).auth_context?.actor_id

const hasAuthenticatedAccess = (req: MedusaRequest, order: TrackingOrder) => {
  const customerId = readAuthCustomerId(req)
  return Boolean(customerId && order.customer_id && order.customer_id === customerId)
}

const hasAuthenticatedMismatch = (req: MedusaRequest, order: TrackingOrder) => {
  const customerId = readAuthCustomerId(req)
  return Boolean(customerId && order.customer_id && order.customer_id !== customerId)
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const orderId = req.params.id as string
    const email = normalizeEmail(req.query?.email as string | undefined)

    const orderModule = req.scope.resolve(Modules.ORDER)
    const order = await orderModule.retrieveOrder(orderId)

    assertOrderBelongsToCurrentStore(req, order)

    const hasAuthAccess = hasAuthenticatedAccess(req, order)
    if (hasAuthenticatedMismatch(req, order)) {
      return res.status(403).json({ error: "Customer does not match order" })
    }

    if (!hasAuthAccess && !email) {
      return res.status(400).json({ error: "email query parameter is required" })
    }

    if (!hasAuthAccess && (!order.email || order.email.trim().toLowerCase() !== email)) {
      return res.status(403).json({ error: "Email does not match order" })
    }

    const foService = req.scope.resolve(FULFILLMENT_ORDERS_MODULE) as FulfillmentOrdersModuleService
    const shipmentService = req.scope.resolve(SHIPMENTS_MODULE) as ShipmentsModuleService
    const storeCoreService = req.scope.resolve(STORE_CORE_MODULE) as StoreCoreModuleService

    const fos = await foService.listFulfillmentOrders({ order_id: [orderId] })
    const fo = fos[0] ?? null

    const shipments = fo
      ? await shipmentService.listShipments({ fulfillment_order_id: [fo.id] })
      : []
    const supplierOrders = await storeCoreService.listSupplierOrders({
      order_id: [orderId],
      store_id: readOrderStoreId(order),
    })

    res.status(200).json({
      order_id: order.id,
      store_id: readOrderStoreId(order),
      payment_status: (order.metadata as Record<string, unknown> | null)?.[ORDER_META_PAYMENT_STATUS] ?? null,
      fulfillment_status: readOrderFulfillmentStatusMeta(order.metadata as Record<string, unknown> | null),
      fulfillment_order: fo,
      shipments,
      supplier_orders: supplierOrders.map((supplierOrder) =>
        normalizeSupplierOrderTracking(supplierOrder as unknown as Record<string, unknown>)
      ),
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
