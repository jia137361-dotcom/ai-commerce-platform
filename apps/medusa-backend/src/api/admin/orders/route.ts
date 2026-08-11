import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { resolveCurrentStore } from "../../../lib/store-context"
import { readOrderStoreId } from "../../../lib/order-store-context"
import {
  ORDER_META_PAYMENT_STATUS,
  readOrderFulfillmentStatusMeta,
  toMedusaAdminOrderFulfillmentStatus,
  toMedusaAdminOrderPaymentStatus,
} from "../../../lib/order-custom-metadata"
import {
  hydrateAdminOrderFromGraph,
  mergeAdminOrderMetadata,
  parseAdminOrdersListQuery,
  summarizeAdminOrderRow,
} from "../../../lib/admin-orders"
import { FULFILLMENT_ORDERS_MODULE } from "../../../modules/fulfillment-orders"
import type FulfillmentOrdersModuleService from "../../../modules/fulfillment-orders/service"
import { SHIPMENTS_MODULE } from "../../../modules/shipments"
import type ShipmentsModuleService from "../../../modules/shipments/service"

const enrichOrderSummary = async (
  req: MedusaRequest,
  o: Record<string, unknown>,
  foService: FulfillmentOrdersModuleService,
  shipmentService: ShipmentsModuleService
) => {
  const orderId = o.id as string
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

  const mcFulfillment = readOrderFulfillmentStatusMeta(o.metadata as Record<string, unknown> | null)
  const meta = o.metadata as Record<string, unknown> | null
  const mcPayment = meta?.[ORDER_META_PAYMENT_STATUS] ?? null

  const { items_count, total } = summarizeAdminOrderRow(o)

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
    items_count,
    total,
    fulfillment_order: fo,
    latest_shipment: latestShipment,
  }
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const storeId = resolveCurrentStore(req).store_id
    const query = parseAdminOrdersListQuery((req.query ?? {}) as Record<string, unknown>)

    const orderModule = req.scope.resolve(Modules.ORDER)
    const foService = req.scope.resolve(FULFILLMENT_ORDERS_MODULE) as FulfillmentOrdersModuleService
    const shipmentService = req.scope.resolve(SHIPMENTS_MODULE) as ShipmentsModuleService

    const listFilters: Record<string, unknown> = {}
    if (query.email) {
      listFilters.email = query.email
    }
    if (query.display_id !== undefined) {
      listFilters.display_id = query.display_id
    }

    const orders = await orderModule.listOrders(listFilters, {
      take: 500,
      order: { created_at: "DESC" },
      relations: ["items"],
    } as never)

    const queryGraph = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data: metadataRows } = (await queryGraph.graph({
      entity: "order",
      fields: ["id", "metadata", "email", "display_id", "items.id", "items.quantity"],
      filters: { id: orders.map((order) => order.id) },
    })) as { data: Array<Record<string, unknown>> }
    const graphById = new Map(metadataRows.map((row) => [String(row.id), row]))
    const ordersWithMetadata = mergeAdminOrderMetadata(
      orders as unknown as Array<Record<string, unknown>>,
      metadataRows as Array<{ id: string; metadata?: Record<string, unknown> | null }>
    ).map((order) =>
      hydrateAdminOrderFromGraph(order, graphById.get(String(order.id)))
    )

    const scoped = ordersWithMetadata.filter((o) => readOrderStoreId(o) === storeId)
    const page = scoped.slice(query.offset, query.offset + query.limit)

    const enriched = await Promise.all(
      page.map((o) =>
        enrichOrderSummary(req, o as unknown as Record<string, unknown>, foService, shipmentService)
      )
    )

    res.status(200).json({
      store_id: storeId,
      count: scoped.length,
      limit: query.limit,
      offset: query.offset,
      orders: enriched,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("Admin 订单列表失败:", error)
    res.status(400).json({ error: message })
  }
}
