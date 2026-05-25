import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { STORE_CORE_MODULE } from "../../modules/store-core"
import type StoreCoreModuleService from "../../modules/store-core/service"
import { FULFILLMENT_ORDERS_MODULE } from "../../modules/fulfillment-orders"
import type FulfillmentOrdersModuleService from "../../modules/fulfillment-orders/service"
import {
  ORDER_META_FULFILLMENT_STATUS,
  normalizeOrderMetadata,
} from "../order-custom-metadata"
import { S2BDIY_SUPPLIER_ID, S2bdiyClient, requireS2bdiyConfig } from "./index"
import { S2bdiyApiError } from "./s2bdiy-client"
import { calculateLogistics, resolveLogisticsPlatformId } from "./s2bdiy-logistics"
import {
  buildDefaultS2bAddress,
  buildThirdOrderId,
  createOrder,
  payOrders,
  extractSupplierOrderId,
  listS2bStores,
  resolveS2bStoreId,
  type S2bOrderAddress,
} from "./s2bdiy-order"
import { syncSupplierOrderById } from "./sync-supplier-orders"
import { toJsonRecord } from "./json-record"
import {
  readDesignedSupplierProductId,
  readMcProductSupplierField,
} from "./mc-product-supplier-fields"

type OrderAddress = {
  country?: string
  country_code?: string
  province?: string
  city?: string
  address_1?: string
  postal_code?: string
  first_name?: string
  last_name?: string
  phone?: string
}

export async function pushOrderToS2bdiy(
  container: MedusaContainer,
  orderId: string
): Promise<{ supplier_order_id: string | null; skipped?: boolean }> {
  if (!process.env.S2BDIY_API_BASE_URL) {
    return { supplier_order_id: null, skipped: true }
  }

  const storeCore = container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService
  const orderModule = container.resolve(Modules.ORDER)
  const order = await orderModule.retrieveOrder(orderId, { relations: ["items", "shipping_address"] })

  const existing = await storeCore.listSupplierOrders({ order_id: [orderId] })
  const paidRow = existing.find((r) => r.supplier_pay_status === "paid")
  if (paidRow?.supplier_order_id) {
    return { supplier_order_id: paidRow.supplier_order_id }
  }

  const storeId =
    (order.metadata as Record<string, unknown> | null)?.store_id?.toString() ??
    process.env.DEFAULT_STORE_ID ??
    "default_store"

  const config = requireS2bdiyConfig()
  const client = new S2bdiyClient(config)

  const items = order.items ?? []
  const orderItems: Array<{
    product_id: string
    size_id: number
    color_id: number
    num: number
    mcProduct: Record<string, unknown>
  }> = []

  for (const item of items) {
    const meta = (item.metadata ?? {}) as Record<string, unknown>
    const mcProductId = meta.mc_product_id as string | undefined
    if (!mcProductId) continue
    const products = await storeCore.listProducts({ id: mcProductId })
    const mc = products[0] as Record<string, unknown> | undefined
    if (!mc) continue
    const designedId = readDesignedSupplierProductId(mc)
    if (!designedId) continue
    const sizeId = Number(
      readMcProductSupplierField(mc, "supplier_size_id") ?? process.env.S2BDIY_TEST_SIZE_ID
    )
    const colorId = Number(
      readMcProductSupplierField(mc, "supplier_color_id") ?? process.env.S2BDIY_TEST_COLOR_ID
    )
    if (!sizeId || !colorId) continue
    orderItems.push({
      product_id: designedId,
      size_id: sizeId,
      color_id: colorId,
      num: Number(item.quantity ?? 1),
      mcProduct: mc,
    })
  }

  if (!orderItems.length) {
    return { supplier_order_id: null, skipped: true }
  }

  const retryCount = existing[0]?.pay_retry_count ?? 0
  const thirdOrderId = buildThirdOrderId(orderId, retryCount)

  const addr = (order.shipping_address ?? {}) as OrderAddress
  const firstMc = orderItems[0].mcProduct
  const basicId =
    String(
      readMcProductSupplierField(firstMc, "basic_product_id") ??
        process.env.S2BDIY_TEST_BASIC_PRODUCT_ID ??
        ""
    )

  const weight = Number(process.env.S2BDIY_DEFAULT_WEIGHT ?? 0.3)
  const length = Number(process.env.S2BDIY_DEFAULT_LENGTH ?? 30)
  const width = Number(process.env.S2BDIY_DEFAULT_WIDTH ?? 25)
  const height = Number(process.env.S2BDIY_DEFAULT_HEIGHT ?? 2)

  const logisticsOptions = await calculateLogistics(client, {
    basic_product_id: basicId,
    platform: config.platformId,
    num: orderItems.reduce((s, i) => s + i.num, 0),
    country: addr.country_code ?? addr.country ?? "US",
    province: (addr as Record<string, unknown>).province as string ?? "",
    postcode: addr.postal_code ?? "",
    weight,
    length,
    width,
    height,
  })

  const logisticsPlatformId = resolveLogisticsPlatformId(logisticsOptions)
  if (!logisticsPlatformId) {
    throw new Error(
      "No logistics option from S2BDIY logisticsCalculation; set S2BDIY_TEST_LOGISTICS_ID or choose another destination"
    )
  }
  const logisticsName =
    logisticsOptions.find((o) => String(o.logistics_platform_id) === logisticsPlatformId)?.name ??
    null

  const s2bStores = await listS2bStores(client)
  const s2bStoreId = resolveS2bStoreId(s2bStores)
  if (!s2bStoreId) {
    throw new Error(
      "No S2BDIY store_id. Call GET /open/v1/store or set S2BDIY_STORE_ID in .env"
    )
  }

  const s2bAddress: S2bOrderAddress = {
    ...buildDefaultS2bAddress(),
    firstname: addr.first_name ?? buildDefaultS2bAddress().firstname,
    lastname: addr.last_name ?? buildDefaultS2bAddress().lastname,
    address: addr.address_1 ?? buildDefaultS2bAddress().address,
    city: addr.city ?? buildDefaultS2bAddress().city,
    province: addr.province ?? buildDefaultS2bAddress().province,
    postcode: addr.postal_code ?? buildDefaultS2bAddress().postcode,
    country: addr.country_code ?? addr.country ?? buildDefaultS2bAddress().country,
    mobile_phone: addr.phone ?? buildDefaultS2bAddress().mobile_phone,
  }

  const createPayload = {
    third_order_id: thirdOrderId,
    platform: config.platformId,
    logistics_id: logisticsPlatformId,
    store_id: Number(s2bStoreId),
    items: orderItems.map((i) => ({
      product_id: i.product_id,
      size_id: i.size_id,
      color_id: i.color_id,
      num: i.num,
    })),
    address: s2bAddress,
  }

  let supplierOrderRowId = existing[0]?.id
  if (!supplierOrderRowId) {
    const created = await storeCore.createSupplierOrders({
      store_id: storeId,
      order_id: orderId,
      supplier_id: S2BDIY_SUPPLIER_ID,
      third_order_id: thirdOrderId,
      platform: config.platformId,
      logistics_id: logisticsPlatformId,
      logistics_name: logisticsName,
      supplier_status: "created",
      raw_request_json: createPayload,
    })
    supplierOrderRowId = created.id
  }

  let supplierOrderId: string | null = existing[0]?.supplier_order_id ?? null
  let createResponse: Record<string, unknown> = {}

  if (!supplierOrderId) {
    try {
      createResponse = await createOrder(client, createPayload)
      supplierOrderId = extractSupplierOrderId(createResponse)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      await storeCore.updateSupplierOrders({
        selector: { id: supplierOrderRowId! },
        data: {
          supplier_status: "failed",
          error_message: message,
          raw_response_json: toJsonRecord(
            error instanceof S2bdiyApiError ? error.body : { error: message }
          ),
        },
      })
      throw error
    }

    await storeCore.updateSupplierOrders({
      selector: { id: supplierOrderRowId! },
      data: {
        supplier_order_id: supplierOrderId,
        supplier_status: "payment_pending",
        raw_response_json: createResponse,
      },
    })
  }

  if (!supplierOrderId) {
    throw new Error("S2BDIY create order did not return supplier order id")
  }

  try {
    await payOrders(client, [supplierOrderId])
    await storeCore.updateSupplierOrders({
      selector: { id: supplierOrderRowId! },
      data: {
        supplier_pay_status: "paid",
        supplier_status: "reviewing",
      },
    })
  } catch (error: unknown) {
    const is502 = error instanceof S2bdiyApiError && error.statusCode === 502
    await storeCore.updateSupplierOrders({
      selector: { id: supplierOrderRowId! },
      data: {
        supplier_pay_status: "pay_failed",
        supplier_status: "payment_pending",
        error_message: error instanceof Error ? error.message : String(error),
        pay_retry_count: retryCount + 1,
        raw_response_json: toJsonRecord(error instanceof S2bdiyApiError ? error.body : null),
      },
    })
    if (!is502) {
      throw error
    }
  }

  const foService = container.resolve(FULFILLMENT_ORDERS_MODULE) as FulfillmentOrdersModuleService
  const foRows = await foService.listFulfillmentOrders({ order_id: [orderId] })
  if (foRows[0]) {
    await foService.updateFulfillmentOrders({
      id: foRows[0].id,
      status: "pushed",
      supplier: "s2bdiy",
      supplier_order_id: supplierOrderId,
      pushed_at: new Date(),
    })
  }

  const meta = normalizeOrderMetadata(order.metadata as Record<string, unknown> | null)
  await orderModule.updateOrders(orderId, {
    metadata: {
      ...meta,
      [ORDER_META_FULFILLMENT_STATUS]: "pushed",
      supplier_order_id: supplierOrderId,
    },
  })

  if (supplierOrderRowId) {
    await syncSupplierOrderById(container, supplierOrderRowId)
  }

  return { supplier_order_id: supplierOrderId }
}

export async function retrySupplierOrderPay(
  container: MedusaContainer,
  orderId: string
): Promise<void> {
  const storeCore = container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService
  const rows = await storeCore.listSupplierOrders({ order_id: [orderId] })
  const row = rows[0]
  if (!row?.supplier_order_id) {
    throw new Error("No supplier order to pay")
  }
  const config = requireS2bdiyConfig()
  const client = new S2bdiyClient(config)
  await payOrders(client, [row.supplier_order_id])
  await storeCore.updateSupplierOrders({
    selector: { id: row.id },
    data: {
      supplier_pay_status: "paid",
      error_message: null,
    },
  })
  await syncSupplierOrderById(container, row.id)
}
