import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { STORE_CORE_MODULE } from "../../modules/store-core"
import type StoreCoreModuleService from "../../modules/store-core/service"
import { FULFILLMENT_ORDERS_MODULE } from "../../modules/fulfillment-orders"
import type FulfillmentOrdersModuleService from "../../modules/fulfillment-orders/service"
import { SHIPMENTS_MODULE } from "../../modules/shipments"
import type ShipmentsModuleService from "../../modules/shipments/service"
import {
  ORDER_META_FULFILLMENT_STATUS,
  normalizeOrderMetadata,
} from "../order-custom-metadata"
import { requireS2bdiyConfig } from "../../modules/suppliers/s2bdiy/config"
import { S2bdiyClient } from "../../modules/suppliers/s2bdiy/s2bdiy-client"
import { getOrderDetailClient } from "../../modules/suppliers/s2bdiy/s2bdiy-order"
import {
  isTerminalSupplierOrderStatus,
  mapS2bOrderStatus,
  mapS2bPayStatus,
} from "../../modules/suppliers/s2bdiy/s2bdiy-status-mapper"
import { toJsonRecord } from "./json-record"

export async function syncSupplierOrderById(
  container: MedusaContainer,
  supplierOrderRowId: string
): Promise<void> {
  const storeCore = container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService
  const rows = await storeCore.listSupplierOrders({ id: supplierOrderRowId })
  const row = rows[0]
  if (!row?.supplier_order_id) {
    return
  }

  const config = requireS2bdiyConfig()
  const client = new S2bdiyClient(config)
  const detail = await getOrderDetailClient(client, row.supplier_order_id)

  const status = mapS2bOrderStatus(detail.status as number)
  const payStatus = mapS2bPayStatus(detail.pay_status as number)
  const logistics = detail.order_logistics as Record<string, unknown> | undefined
  const tracking =
    (logistics?.logisticss_track_number as string) ??
    (logistics?.tracking_number as string) ??
    null
  const waybillUrl =
    (logistics?.oss_file_src as string) ?? (detail.waybill_url as string) ?? null

  await storeCore.updateSupplierOrders({
    selector: { id: row.id },
    data: {
      supplier_status: status,
      supplier_status_text: String(detail.status_text ?? ""),
      supplier_pay_status: payStatus,
      supplier_pay_status_text: String(detail.pay_status_text ?? ""),
      product_amount: Number(detail.product_amount ?? 0),
      shipping_amount: Number(detail.shipping_amount ?? 0),
      total_amount: Number(detail.total_amount ?? 0),
      tracking_number: tracking,
      waybill_url: waybillUrl,
      last_synced_at: new Date(),
      raw_response_json: toJsonRecord(detail),
    },
  })

  const orderModule = container.resolve(Modules.ORDER)
  const order = await orderModule.retrieveOrder(row.order_id)
  const meta = normalizeOrderMetadata(order.metadata as Record<string, unknown> | null)
  const fulfillmentStatus =
    status === "shipped" ? "fulfilled" : status === "cancelled" ? "canceled" : "pushed"

  await orderModule.updateOrders(row.order_id, {
    metadata: {
      ...meta,
      [ORDER_META_FULFILLMENT_STATUS]: fulfillmentStatus,
      supplier_tracking_number: tracking,
      supplier_waybill_url: waybillUrl,
    },
  })

  if (status === "shipped" && tracking) {
    const foService = container.resolve(FULFILLMENT_ORDERS_MODULE) as FulfillmentOrdersModuleService
    const shipmentService = container.resolve(SHIPMENTS_MODULE) as ShipmentsModuleService
    const foRows = await foService.listFulfillmentOrders({ order_id: [row.order_id] })
    const fo = foRows[0]
    if (fo) {
      await foService.updateFulfillmentOrders({ id: fo.id, status: "fulfilled" })
      const existingShipments = await shipmentService.listShipments({
        order_id: [row.order_id],
      })
      if (!existingShipments.length) {
        await shipmentService.createShipments({
          store_id: row.store_id,
          order_id: row.order_id,
          fulfillment_order_id: fo.id,
          tracking_number: tracking,
          tracking_url: waybillUrl,
          status: "shipped",
          shipped_at: new Date(),
        })
      }
    }
  }
}

export async function syncPendingSupplierOrders(container: MedusaContainer): Promise<number> {
  if (!process.env.S2BDIY_API_BASE_URL) {
    return 0
  }
  const storeCore = container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService
  const rows = await storeCore.listSupplierOrders({})
  let synced = 0
  for (const row of rows) {
    if (!row.supplier_order_id) continue
    const status =
      row.supplier_status as import("../../modules/suppliers/s2bdiy/s2bdiy-status-mapper").SupplierOrderStatus
    if (isTerminalSupplierOrderStatus(status)) continue
    try {
      await syncSupplierOrderById(container, row.id)
      synced++
    } catch (error) {
      console.error(`sync supplier order ${row.id} failed:`, error)
    }
  }
  return synced
}
