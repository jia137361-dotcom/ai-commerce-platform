import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { STORE_CORE_MODULE } from "../../modules/store-core"
import type StoreCoreModuleService from "../../modules/store-core/service"
import { readPlatformStatus } from "./require-platform-operator"

export async function listPlatformSellers(container: MedusaContainer, options: { limit: number; offset: number; q?: string }) {
  const userModule = container.resolve(Modules.USER) as {
    listUsers: (
      filters?: object,
      config?: object
    ) => Promise<
      Array<{
        id: string
        email?: string
        first_name?: string | null
        last_name?: string | null
        created_at?: Date | string
        metadata?: Record<string, unknown> | null
      }>
    >
  }
  const storeCore = container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService

  const users = await userModule.listUsers(
    {},
    { take: 10000, order: { created_at: "DESC" }, select: ["id", "email", "first_name", "last_name", "created_at", "metadata"] }
  )

  const members = await storeCore.listStoreMembers({}, { take: 10000 })
  const stores = await storeCore.listStores({}, { take: 1000 })
  const storeById = new Map(stores.map((store) => [store.id, store]))

  const membersByUser = new Map<string, Array<{ store_id: string; role: string }>>()
  for (const member of members as Array<{ user_id: string; store_id: string; role: string }>) {
    const list = membersByUser.get(member.user_id) ?? []
    list.push({ store_id: member.store_id, role: member.role })
    membersByUser.set(member.user_id, list)
  }

  const sellerUsers = users.filter((user) => (membersByUser.get(user.id) ?? []).length > 0)
  const q = options.q?.trim().toLowerCase()
  const filtered = q
    ? sellerUsers.filter((user) => (user.email ?? "").toLowerCase().includes(q) || user.id.toLowerCase().includes(q))
    : sellerUsers

  const page = filtered.slice(options.offset, options.offset + options.limit)

  return {
    count: filtered.length,
    sellers: page.map((user) => ({
      user_id: user.id,
      email: user.email ?? null,
      name: [user.first_name, user.last_name].filter(Boolean).join(" ") || null,
      created_at: user.created_at ?? null,
      platform_status: readPlatformStatus(user.metadata) ?? "active",
      stores: (membersByUser.get(user.id) ?? []).map((member) => ({
        store_id: member.store_id,
        store_name: storeById.get(member.store_id)?.name ?? member.store_id,
        role: member.role,
        store_status: storeById.get(member.store_id)?.status ?? null,
      })),
    })),
  }
}

export async function getPlatformSeller(container: MedusaContainer, userId: string) {
  const userModule = container.resolve(Modules.USER) as {
    retrieveUser: (id: string) => Promise<{
      id: string
      email?: string
      first_name?: string | null
      last_name?: string | null
      created_at?: Date | string
      metadata?: Record<string, unknown> | null
    }>
  }
  const storeCore = container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService

  const user = await userModule.retrieveUser(userId)
  const members = await storeCore.listStoreMembers({ user_id: userId })
  const stores = await storeCore.listStores({}, { take: 1000 })
  const storeById = new Map(stores.map((store) => [store.id, store]))

  return {
    user_id: user.id,
    email: user.email ?? null,
    name: [user.first_name, user.last_name].filter(Boolean).join(" ") || null,
    created_at: user.created_at ?? null,
    platform_status: readPlatformStatus(user.metadata) ?? "active",
    stores: members.map((member: { store_id: string; role: string }) => ({
      store_id: member.store_id,
      store_name: storeById.get(member.store_id)?.name ?? member.store_id,
      role: member.role,
      store_status: storeById.get(member.store_id)?.status ?? null,
    })),
  }
}

export async function listPlatformBuyers(container: MedusaContainer, options: { limit: number; offset: number; q?: string }) {
  const customerModule = container.resolve(Modules.CUSTOMER) as {
    listCustomers: (
      filters?: object,
      config?: object
    ) => Promise<
      Array<{
        id: string
        email?: string
        first_name?: string | null
        last_name?: string | null
        created_at?: Date | string
        metadata?: Record<string, unknown> | null
      }>
    >
  }
  const orderModule = container.resolve(Modules.ORDER) as {
    listOrders: (filters?: object, config?: object) => Promise<Array<{ id: string; customer_id?: string | null; email?: string | null }>>
  }

  const customers = await customerModule.listCustomers(
    {},
    { take: 10000, order: { created_at: "DESC" }, select: ["id", "email", "first_name", "last_name", "created_at", "metadata"] }
  )
  const orders = await orderModule.listOrders({}, { take: 10000, select: ["id", "customer_id", "email"] })
  const orderCountByCustomer = new Map<string, number>()
  for (const order of orders) {
    if (!order.customer_id) continue
    orderCountByCustomer.set(order.customer_id, (orderCountByCustomer.get(order.customer_id) ?? 0) + 1)
  }

  const q = options.q?.trim().toLowerCase()
  const filtered = q
    ? customers.filter(
        (customer) =>
          (customer.email ?? "").toLowerCase().includes(q) || customer.id.toLowerCase().includes(q)
      )
    : customers

  const page = filtered.slice(options.offset, options.offset + options.limit)

  return {
    count: filtered.length,
    buyers: page.map((customer) => ({
      customer_id: customer.id,
      email: customer.email ?? null,
      name: [customer.first_name, customer.last_name].filter(Boolean).join(" ") || null,
      created_at: customer.created_at ?? null,
      platform_status: readPlatformStatus(customer.metadata) ?? "active",
      order_count: orderCountByCustomer.get(customer.id) ?? 0,
    })),
  }
}

export async function getPlatformBuyer(container: MedusaContainer, customerId: string) {
  const customerModule = container.resolve(Modules.CUSTOMER) as {
    retrieveCustomer: (id: string) => Promise<{
      id: string
      email?: string
      first_name?: string | null
      last_name?: string | null
      created_at?: Date | string
      metadata?: Record<string, unknown> | null
    }>
  }
  const orderModule = container.resolve(Modules.ORDER) as {
    listOrders: (
      filters?: object,
      config?: object
    ) => Promise<Array<{ id: string; display_id?: number; created_at?: Date | string; email?: string | null; metadata?: Record<string, unknown> | null }>>
  }

  const customer = await customerModule.retrieveCustomer(customerId)
  const orders = await orderModule.listOrders(
    { customer_id: customerId },
    { take: 50, order: { created_at: "DESC" }, select: ["id", "display_id", "created_at", "email", "metadata"] }
  )

  return {
    customer_id: customer.id,
    email: customer.email ?? null,
    name: [customer.first_name, customer.last_name].filter(Boolean).join(" ") || null,
    created_at: customer.created_at ?? null,
    platform_status: readPlatformStatus(customer.metadata) ?? "active",
    orders: orders.map((order) => ({
      order_id: order.id,
      display_id: order.display_id ?? null,
      created_at: order.created_at ?? null,
      store_id: (order.metadata as Record<string, unknown> | undefined)?.store_id ?? null,
    })),
  }
}
