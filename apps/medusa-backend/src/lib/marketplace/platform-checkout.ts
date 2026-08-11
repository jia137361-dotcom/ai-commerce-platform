import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { randomUUID } from "crypto"
import { readCartStoreId } from "../assert-cart-store"
import { STORE_CORE_MODULE } from "../../modules/store-core"
import type StoreCoreModuleService from "../../modules/store-core/service"
import {
  ORDER_META_PLATFORM_CHECKOUT_COUNT,
  ORDER_META_PLATFORM_CHECKOUT_ID,
  ORDER_META_PLATFORM_CHECKOUT_INDEX,
} from "../order-custom-metadata"

export type PlatformCheckoutGroupInput = {
  store_id: string
  cart_id: string
}

export type PreparedPlatformCheckoutGroup = {
  store_id: string
  cart_id: string
  store_name: string
  item_count: number
  subtotal: number
  total: number
  currency_code: string
}

export async function preparePlatformCheckout(
  container: MedusaContainer,
  groups: PlatformCheckoutGroupInput[]
) {
  if (!groups.length) {
    throw new Error("At least one store cart is required")
  }

  const cartModule = container.resolve(Modules.CART)
  const storeCore = container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService
  const stores = await storeCore.listStores({}, { take: 1000 })
  const storeById = new Map(stores.map((store) => [store.id, store]))

  const prepared: PreparedPlatformCheckoutGroup[] = []

  for (const group of groups) {
    const storeId = group.store_id?.trim()
    const cartId = group.cart_id?.trim()
    if (!storeId || !cartId) {
      throw new Error("Each checkout group requires store_id and cart_id")
    }

    const cart = await cartModule.retrieveCart(cartId, { relations: ["items"] })
    const cartStoreId = readCartStoreId(cart)
    if (cartStoreId !== storeId) {
      throw new Error(`Cart ${cartId} does not belong to store ${storeId}`)
    }

    const items = cart.items ?? []
    if (!items.length) {
      throw new Error(`Cart ${cartId} for store ${storeId} is empty`)
    }

    const subtotal = items.reduce((sum, item) => {
      const unit = typeof item.unit_price === "number" ? item.unit_price : Number(item.unit_price ?? 0)
      const qty = typeof item.quantity === "number" ? item.quantity : Number(item.quantity ?? 1)
      return sum + unit * qty
    }, 0)

    prepared.push({
      store_id: storeId,
      cart_id: cartId,
      store_name: storeById.get(storeId)?.name ?? storeId,
      item_count: items.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0),
      subtotal,
      total: typeof cart.total === "number" ? cart.total : subtotal,
      currency_code: cart.currency_code ?? "usd",
    })
  }

  prepared.sort((left, right) => left.store_name.localeCompare(right.store_name))

  const platformCheckoutId = `pc_${randomUUID()}`
  const grandSubtotal = prepared.reduce((sum, group) => sum + group.subtotal, 0)
  const grandTotal = prepared.reduce((sum, group) => sum + group.total, 0)

  return {
    platform_checkout_id: platformCheckoutId,
    group_count: prepared.length,
    grand_subtotal: grandSubtotal,
    grand_total: grandTotal,
    currency_code: prepared[0]?.currency_code ?? "usd",
    groups: prepared.map((group, index) => ({
      ...group,
      platform_checkout_index: index,
      platform_checkout_count: prepared.length,
    })),
  }
}

export async function applyPlatformCheckoutMetadata(
  container: MedusaContainer,
  orderId: string,
  input: {
    platform_checkout_id: string
    platform_checkout_index: number
    platform_checkout_count: number
  }
) {
  const orderModule = container.resolve(Modules.ORDER)
  const order = await orderModule.retrieveOrder(orderId)
  const metadata = {
    ...(order.metadata ?? {}),
    [ORDER_META_PLATFORM_CHECKOUT_ID]: input.platform_checkout_id,
    [ORDER_META_PLATFORM_CHECKOUT_INDEX]: input.platform_checkout_index,
    [ORDER_META_PLATFORM_CHECKOUT_COUNT]: input.platform_checkout_count,
  }
  await orderModule.updateOrders(orderId, { metadata } as never)
}

export async function listOrdersByPlatformCheckoutId(
  container: MedusaContainer,
  platformCheckoutId: string
) {
  const orderModule = container.resolve(Modules.ORDER)
  const orders = await orderModule.listOrders({}, {
    take: 500,
    order: { created_at: "ASC" },
    select: ["id", "display_id", "created_at", "metadata", "status"],
  } as never)
  const matched = orders.filter(
    (order) =>
      (order.metadata as Record<string, unknown> | null | undefined)?.[
        ORDER_META_PLATFORM_CHECKOUT_ID
      ] === platformCheckoutId
  )
  const enriched = await Promise.all(
    matched.map(async (order) => {
      const full = await orderModule.retrieveOrder(String(order.id), {
        select: ["id", "display_id", "created_at", "currency_code", "total", "metadata", "status"],
      } as never)
      return full
    })
  )
  return enriched
}
