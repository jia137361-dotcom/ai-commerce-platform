import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { STORE_CORE_MODULE } from "../../modules/store-core"
import type StoreCoreModuleService from "../../modules/store-core/service"
import { readOrderStoreId } from "../order-store-context"
import {
  buildFulfillmentTimeline,
  loadAdminOrderRecord,
  normalizeMoney,
  normalizeOrderLineItem,
  serializeAdminOrderSummary,
  summarizeAdminOrderRow,
} from "../admin-orders"
import { FULFILLMENT_ORDERS_MODULE } from "../../modules/fulfillment-orders"
import type FulfillmentOrdersModuleService from "../../modules/fulfillment-orders/service"
import { SHIPMENTS_MODULE } from "../../modules/shipments"
import type ShipmentsModuleService from "../../modules/shipments/service"
import {
  ORDER_META_PAYMENT_STATUS,
  ORDER_META_PLATFORM_CHECKOUT_ID,
  readOrderFulfillmentStatusMeta,
  toMedusaAdminOrderFulfillmentStatus,
  toMedusaAdminOrderPaymentStatus,
} from "../order-custom-metadata"
import { listOrdersByPlatformCheckoutId } from "../marketplace/platform-checkout"

export async function listPlatformStores(container: MedusaContainer, options: { limit: number; offset: number; q?: string }) {
  const storeCore = container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService
  const stores = await storeCore.listStores({}, { take: 1000, order: { created_at: "DESC" } })
  const products = await storeCore.listProducts({}, { take: 10000, select: ["id", "store_id", "status"] })
  const orderModule = container.resolve(Modules.ORDER) as {
    listOrders: (filters?: object, config?: object) => Promise<Array<{ id: string; metadata?: Record<string, unknown> | null }>>
  }
  const orders = await orderModule.listOrders({}, { take: 10000, select: ["id", "metadata"] })

  const productCountByStore = new Map<string, number>()
  for (const product of products as Array<{ store_id: string }>) {
    productCountByStore.set(product.store_id, (productCountByStore.get(product.store_id) ?? 0) + 1)
  }
  const orderCountByStore = new Map<string, number>()
  for (const order of orders) {
    const storeId = readOrderStoreId(order)
    orderCountByStore.set(storeId, (orderCountByStore.get(storeId) ?? 0) + 1)
  }

  const q = options.q?.trim().toLowerCase()
  const filtered = q
    ? stores.filter(
        (store) =>
          store.name.toLowerCase().includes(q) ||
          store.id.toLowerCase().includes(q) ||
          store.slug.toLowerCase().includes(q)
      )
    : stores

  const page = filtered.slice(options.offset, options.offset + options.limit)

  return {
    count: filtered.length,
    stores: page.map((store) => ({
      store_id: store.id,
      name: store.name,
      slug: store.slug,
      status: store.status,
      owner_user_id: store.owner_user_id ?? null,
      created_at: store.created_at ?? null,
      product_count: productCountByStore.get(store.id) ?? 0,
      order_count: orderCountByStore.get(store.id) ?? 0,
    })),
  }
}

export async function getPlatformStore(container: MedusaContainer, storeId: string) {
  const storeCore = container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService
  const stores = await storeCore.listStores({ id: storeId })
  const store = stores[0]
  if (!store) return null

  const [products, members, settings] = await Promise.all([
    storeCore.listProducts({ store_id: storeId }, { take: 1000 }),
    storeCore.listStoreMembers({ store_id: storeId }),
    storeCore.listStoreSettings({ store_id: storeId }),
  ])

  const orderModule = container.resolve(Modules.ORDER) as {
    listOrders: (
      filters?: object,
      config?: object
    ) => Promise<Array<{ id: string; display_id?: number; created_at?: Date | string; metadata?: Record<string, unknown> | null }>>
  }
  const orders = await orderModule.listOrders({}, { take: 500, order: { created_at: "DESC" }, select: ["id", "display_id", "created_at", "metadata"] })
  const storeOrders = orders.filter((order) => readOrderStoreId(order) === storeId).slice(0, 20)

  return {
    store_id: store.id,
    name: store.name,
    slug: store.slug,
    status: store.status,
    owner_user_id: store.owner_user_id ?? null,
    created_at: store.created_at ?? null,
    product_count: products.length,
    published_product_count: products.filter((product: { status?: string }) => product.status === "published").length,
    member_count: members.length,
    members: members.map((member: { user_id: string; role: string }) => ({
      user_id: member.user_id,
      role: member.role,
    })),
    settings: settings[0] ?? null,
    recent_orders: storeOrders.map((order) => ({
      order_id: order.id,
      display_id: order.display_id ?? null,
      created_at: order.created_at ?? null,
    })),
  }
}

export async function listPlatformOrders(container: MedusaContainer, options: { limit: number; offset: number; storeId?: string; email?: string }) {
  const orderModule = container.resolve(Modules.ORDER) as unknown as {
    listOrders: (
      filters?: object,
      config?: object
    ) => Promise<Array<Record<string, unknown>>>
  }

  const listFilters: Record<string, unknown> = {}
  if (options.email) listFilters.email = options.email

  const orders = await orderModule.listOrders(listFilters, {
    take: 1000,
    order: { created_at: "DESC" },
    relations: ["items"],
  } as never)

  const scoped = options.storeId
    ? orders.filter((order) => readOrderStoreId(order) === options.storeId)
    : orders

  const page = scoped.slice(options.offset, options.offset + options.limit)

  return {
    count: scoped.length,
    orders: page.map((order) => {
      const meta = (order.metadata ?? {}) as Record<string, unknown>
      const mcFulfillment = readOrderFulfillmentStatusMeta(meta)
      const mcPayment = meta[ORDER_META_PAYMENT_STATUS] ?? null
      const { items_count, total } = summarizeAdminOrderRow(order)
      return {
        order_id: order.id,
        display_id: order.display_id ?? null,
        email: order.email ?? null,
        created_at: order.created_at ?? null,
        store_id: readOrderStoreId(order),
        currency_code: order.currency_code ?? null,
        payment_status: toMedusaAdminOrderPaymentStatus(mcPayment),
        fulfillment_status: toMedusaAdminOrderFulfillmentStatus(mcFulfillment),
        items_count,
        total,
      }
    }),
  }
}

export async function getPlatformOrder(container: MedusaContainer, orderId: string) {
  try {
    const storeCore = container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService
    const foService = container.resolve(FULFILLMENT_ORDERS_MODULE) as FulfillmentOrdersModuleService
    const shipmentService = container.resolve(SHIPMENTS_MODULE) as ShipmentsModuleService

    const order = await loadAdminOrderRecord(container, orderId)
    const fos = await foService.listFulfillmentOrders({ order_id: [orderId] })
    const fulfillmentOrder = (fos[0] ?? null) as Record<string, unknown> | null
    const shipments = fulfillmentOrder
      ? await shipmentService.listShipments({ fulfillment_order_id: [fulfillmentOrder.id as string] })
      : []
    const latestShipment =
      shipments.length > 0
        ? ([...shipments].sort((a, b) => {
            const ta = a.shipped_at ? new Date(a.shipped_at as Date | string).getTime() : 0
            const tb = b.shipped_at ? new Date(b.shipped_at as Date | string).getTime() : 0
            return tb - ta
          })[0] as Record<string, unknown>)
        : null

    let supplierOrder: Record<string, unknown> | null = null
    try {
      const supplierRows = await storeCore.listSupplierOrders({ order_id: [orderId] })
      supplierOrder = (supplierRows[0] as Record<string, unknown> | undefined) ?? null
    } catch {
      supplierOrder = null
    }

    const summary = serializeAdminOrderSummary({
      order,
      fulfillmentOrder,
      supplierOrder,
    })
    const { items_count, total } = summarizeAdminOrderRow(order as unknown as Record<string, unknown>)
    const mcFulfillmentRaw = readOrderFulfillmentStatusMeta(order.metadata as Record<string, unknown> | null)
    const mcFulfillment = typeof mcFulfillmentRaw === "string" ? mcFulfillmentRaw : null
    const timelineSteps = buildFulfillmentTimeline({
      mcFulfillmentStatus: mcFulfillment,
      fulfillmentOrder,
      latestShipment,
      orderCreatedAt: order.created_at,
    })

    const storeId = readOrderStoreId(order)
    const stores = storeId ? await storeCore.listStores({ id: storeId }) : []
    const store = stores[0]

    const platformCheckoutId =
      typeof (order.metadata as Record<string, unknown> | null)?.[ORDER_META_PLATFORM_CHECKOUT_ID] ===
      "string"
        ? ((order.metadata as Record<string, unknown>)[ORDER_META_PLATFORM_CHECKOUT_ID] as string)
        : null
    const relatedPlatformOrders = platformCheckoutId
      ? (await listOrdersByPlatformCheckoutId(container, platformCheckoutId))
          .filter((related) => related.id !== order.id)
          .map((related) => ({
            order_id: String(related.id ?? ""),
            display_id: related.display_id ?? null,
            store_id: readOrderStoreId(related as { metadata?: Record<string, unknown> }),
            total: normalizeMoney(
              typeof related.total === "number" ? related.total : Number(related.total ?? NaN)
            ),
            currency_code: related.currency_code ?? null,
          }))
      : []

    return {
      ...summary,
      created_at: order.created_at ?? null,
      store_id: storeId,
      store_name: store?.name ?? null,
      currency_code: order.currency_code ?? null,
      items_count,
      total,
      items: (Array.isArray(order.items) ? order.items : []).map((item) => {
        const normalized = normalizeOrderLineItem(item as unknown as Record<string, unknown>)
        const unit =
          typeof normalized.unit_price === "number"
            ? normalized.unit_price
            : Number(normalized.unit_price ?? NaN)
        const lineTotal =
          typeof normalized.total === "number" ? normalized.total : Number(normalized.total ?? NaN)
        return {
          ...normalized,
          unit_price: normalizeMoney(Number.isFinite(unit) ? unit : null),
          total: normalizeMoney(Number.isFinite(lineTotal) ? lineTotal : null),
        }
      }),
      fulfillment_order: fulfillmentOrder
        ? {
            id: fulfillmentOrder.id ?? null,
            status: fulfillmentOrder.status ?? null,
            supplier: fulfillmentOrder.supplier ?? null,
            supplier_order_id: fulfillmentOrder.supplier_order_id ?? null,
            pushed_at: fulfillmentOrder.pushed_at ?? null,
          }
        : null,
      latest_shipment: latestShipment
        ? {
            carrier: latestShipment.carrier ?? null,
            tracking_number: latestShipment.tracking_number ?? null,
            tracking_url: latestShipment.tracking_url ?? null,
            shipped_at: latestShipment.shipped_at ?? null,
            delivered_at: latestShipment.delivered_at ?? null,
            status: latestShipment.status ?? null,
          }
        : null,
      supplier_order: supplierOrder
        ? {
            id: supplierOrder.id ?? null,
            supplier_id: supplierOrder.supplier_id ?? null,
            supplier_order_id: supplierOrder.supplier_order_id ?? null,
            third_order_id: supplierOrder.third_order_id ?? null,
            supplier_status: supplierOrder.supplier_status ?? null,
          }
        : null,
      timeline_steps: timelineSteps,
      platform_checkout_id: platformCheckoutId,
      related_platform_orders: relatedPlatformOrders,
      metadata: (order.metadata ?? {}) as Record<string, unknown>,
    }
  } catch {
    return null
  }
}
