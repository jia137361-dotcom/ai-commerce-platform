import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { FULFILLMENT_ORDERS_MODULE } from "../modules/fulfillment-orders"
import type FulfillmentOrdersModuleService from "../modules/fulfillment-orders/service"
import {
  ORDER_META_FULFILLMENT_STATUS,
  ORDER_META_PAYMENT_STATUS,
  normalizeOrderMetadata,
  type OrderFulfillmentStatus,
  type OrderPaymentStatus,
} from "./order-custom-metadata"
import { createPendingReferralCommission } from "./referral-program"

type PaymentModuleLike = {
  listPayments: (
    filters: { payment_collection_id?: string | string[] },
    config?: { relations?: string[] }
  ) => Promise<Array<{ captured_at?: Date | null; captures?: unknown[] }>>
}

const FULFILLMENT_STATUS_WAITING = "waiting"
const FULFILLMENT_STATUS_PENDING_CAPTURE = "pending_capture"
const PROTECTED_FULFILLMENT_STATUSES = new Set([
  "canceled",
  "failed",
  "pushed",
  "in_production",
  "shipped",
  "delivered",
  "fulfilled",
])

export function providerDefersPaidUntilCapture(providerId: string): boolean {
  return providerId.includes("stripe") || providerId.includes("paypal")
}

function mergeMeta(
  existing: Record<string, unknown> | null | undefined,
  patch: Record<string, unknown>
): Record<string, unknown> {
  return { ...(existing ?? {}), ...patch }
}

async function listOrderFulfillmentOrders(
  foService: FulfillmentOrdersModuleService,
  orderId: string
) {
  const rows = await foService.listFulfillmentOrders({ order_id: [orderId] })
  if (rows.length > 1) {
    const ids = rows.map((row) => row.id).filter(Boolean).join(", ")
    throw new Error(`Order ${orderId} has multiple fulfillment orders: ${ids || "unknown ids"}`)
  }
  return rows
}

function canTransitionFulfillmentToWaiting(status: unknown): boolean {
  return status === FULFILLMENT_STATUS_PENDING_CAPTURE
}

function shouldPreserveFulfillmentStatus(status: unknown): boolean {
  return typeof status === "string" && PROTECTED_FULFILLMENT_STATUSES.has(status)
}

export async function markOrderPaidAndFulfillmentWaiting(
  container: MedusaContainer,
  orderId: string,
  source: string
): Promise<void> {
  const orderModule = container.resolve(Modules.ORDER)
  const foService = container.resolve(FULFILLMENT_ORDERS_MODULE) as FulfillmentOrdersModuleService

  const order = await orderModule.retrieveOrder(orderId)
  const meta = normalizeOrderMetadata(order.metadata as Record<string, unknown> | null)
  const existing = await listOrderFulfillmentOrders(foService, orderId)
  const row = existing[0]
  const rowStatus = row?.status

  if (meta[ORDER_META_PAYMENT_STATUS] === "paid") {
    if (row && canTransitionFulfillmentToWaiting(rowStatus)) {
      await foService.updateFulfillmentOrders({
        id: row.id,
        status: FULFILLMENT_STATUS_WAITING,
      })
    }
    return
  }

  const fulfillmentStatusPatch =
    shouldPreserveFulfillmentStatus(rowStatus)
      ? {}
      : { [ORDER_META_FULFILLMENT_STATUS]: FULFILLMENT_STATUS_WAITING satisfies OrderFulfillmentStatus }
  const nextMeta = mergeMeta(meta, {
    [ORDER_META_PAYMENT_STATUS]: "paid" satisfies OrderPaymentStatus,
    ...fulfillmentStatusPatch,
    payment_confirmed_at: new Date().toISOString(),
    payment_confirmed_source: source,
  })

  await orderModule.updateOrders(orderId, { metadata: nextMeta })

  if (!row) {
    return
  }

  if (canTransitionFulfillmentToWaiting(rowStatus)) {
    await foService.updateFulfillmentOrders({
      id: row.id,
      status: FULFILLMENT_STATUS_WAITING,
    })
  }
}

export async function seedFulfillmentOrderIfMissing(
  container: MedusaContainer,
  input: {
    orderId: string
    storeId: string
    paymentCollectionId: string | null | undefined
  }
): Promise<void> {
  if (!input.paymentCollectionId) {
    return
  }
  const foService = container.resolve(FULFILLMENT_ORDERS_MODULE) as FulfillmentOrdersModuleService
  const existing = await listOrderFulfillmentOrders(foService, input.orderId)
  if (existing.length > 0) {
    return
  }
  await foService.createFulfillmentOrders({
    order_id: input.orderId,
    store_id: input.storeId,
    payment_collection_id: input.paymentCollectionId,
    supplier: "mock",
    status: "pending_capture",
  })
}

export async function setOrderPostCompletePendingMetadata(
  container: MedusaContainer,
  orderId: string,
  storeId?: string
): Promise<void> {
  const orderModule = container.resolve(Modules.ORDER)
  const order = await orderModule.retrieveOrder(orderId)
  const meta = mergeMeta(
    normalizeOrderMetadata(order.metadata as Record<string, unknown> | null),
    {
      ...(storeId ? { store_id: storeId } : {}),
      [ORDER_META_PAYMENT_STATUS]: "pending" satisfies OrderPaymentStatus,
      [ORDER_META_FULFILLMENT_STATUS]: "none" satisfies OrderFulfillmentStatus,
    }
  )
  await orderModule.updateOrders(orderId, { metadata: meta })
}

export async function syncPaidIfPaymentAlreadyCaptured(
  container: MedusaContainer,
  orderId: string,
  paymentCollectionId: string | null | undefined
): Promise<boolean> {
  if (!paymentCollectionId) {
    return false
  }
  const paymentModule = container.resolve(Modules.PAYMENT) as PaymentModuleLike
  const payments = await paymentModule.listPayments(
    { payment_collection_id: paymentCollectionId },
    { relations: ["captures"] }
  )
  const captured = payments.some(
    (p) =>
      (p.captured_at != null && String(p.captured_at).length > 0) ||
      (Array.isArray(p.captures) && p.captures.length > 0)
  )
  if (!captured) {
    return false
  }
  await markOrderPaidAndFulfillmentWaiting(container, orderId, "payment_capture_detected")
  try {
    await createPendingReferralCommission(container, orderId)
  } catch (error) {
    // Payment recovery must not fail after capture because referral bookkeeping
    // can be reconciled independently on the next commission job run.
    console.error("Failed to create recovered pending referral commission:", error)
  }
  return true
}
