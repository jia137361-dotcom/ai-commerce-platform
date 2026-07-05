import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { STORE_CORE_MODULE } from "../../modules/store-core"
import type StoreCoreModuleService from "../../modules/store-core/service"
import { readOrderStoreId } from "../order-store-context"
import { bucketCreatedAtByDay, lastNDays } from "./platform-utils"

export async function buildPlatformOverview(container: MedusaContainer) {
  const userModule = container.resolve(Modules.USER) as {
    listUsers: (filters?: object, config?: object) => Promise<Array<{ id: string; created_at?: Date | string }>>
  }
  const customerModule = container.resolve(Modules.CUSTOMER) as {
    listCustomers: (
      filters?: object,
      config?: object
    ) => Promise<Array<{ id: string; created_at?: Date | string }>>
  }
  const orderModule = container.resolve(Modules.ORDER) as {
    listOrders: (filters?: object, config?: object) => Promise<Array<{ id: string; created_at?: Date | string }>>
  }
  const storeCore = container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService

  const [users, customers, stores, orders] = await Promise.all([
    userModule.listUsers({}, { take: 10000, select: ["id", "created_at"] }),
    customerModule.listCustomers({}, { take: 10000, select: ["id", "created_at"] }),
    storeCore.listStores({}, { take: 1000 }),
    orderModule.listOrders({}, { take: 10000, select: ["id", "created_at", "metadata"] }),
  ])

  const days = lastNDays(7)

  return {
    totals: {
      sellers: users.length,
      buyers: customers.length,
      stores: stores.length,
      orders: orders.length,
    },
    registration_trends: {
      sellers: bucketCreatedAtByDay(users, days),
      buyers: bucketCreatedAtByDay(customers, days),
      stores: bucketCreatedAtByDay(stores as Array<{ created_at?: Date | string }>, days),
    },
    orders_by_store: summarizeOrdersByStore(orders as Array<{ metadata?: Record<string, unknown> | null }>),
  }
}

function summarizeOrdersByStore(orders: Array<{ metadata?: Record<string, unknown> | null }>) {
  const counts = new Map<string, number>()
  for (const order of orders) {
    const storeId = readOrderStoreId(order)
    counts.set(storeId, (counts.get(storeId) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([store_id, count]) => ({ store_id, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}
