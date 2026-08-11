import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  ORDER_META_SELLER_PAYOUT_AMOUNT,
  ORDER_META_SELLER_PAYOUT_AT,
  ORDER_META_SELLER_PAYOUT_ERROR,
  ORDER_META_SELLER_PAYOUT_STATUS,
  ORDER_META_SELLER_PAYOUT_TRANSFER_ID,
} from "./order-custom-metadata"
import type { CancellationOrder } from "./order-cancellation"
import { resolveRefundableAmount } from "./order-refund-request"
import { readOrderStoreId } from "./order-store-context"
import { isConnectAccountReady, retrieveConnectAccount } from "./seller-stripe-connect"
import { isStripeConfigured, stripeApiRequest } from "./stripe-client"
import { STORE_CORE_MODULE } from "../modules/store-core"
import type StoreCoreModuleService from "../modules/store-core/service"
import { createStoreNotification } from "./notifications"

export type SellerPayoutStatus =
  | "completed"
  | "pending_account"
  | "skipped_no_stripe"
  | "skipped_already_paid"
  | "failed"

export type SellerPayoutResult = {
  status: SellerPayoutStatus
  transfer_id?: string | null
  amount?: number | null
  currency_code?: string | null
  error?: string | null
}

/**
 * Ensure an amount is in minor units (cents) for Stripe payout.
 * If the amount is already > 999, assume it's in cents (already minor).
 * Otherwise treat as dollars and convert to cents.
 *
 * NOTE: This heuristic is preserved for backward compatibility with existing
 * payout records. New code should use explicit unit conversion.
 */
const readMinorAmount = (amount: number): number => {
  if (!Number.isFinite(amount) || amount <= 0) return 0
  return amount > 999 ? Math.round(amount) : Math.round(amount * 100)
}

const loadOrderForPayout = async (container: MedusaContainer, orderId: string) => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = (await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "status",
      "currency_code",
      "total",
      "metadata",
      "payment_collections.id",
      "payment_collections.status",
      "payment_collections.currency_code",
      "payment_collections.amount",
      "payment_collections.completed_at",
      "payment_collections.captured_amount",
      "payment_collections.raw_captured_amount",
      "payment_collections.payments.id",
      "payment_collections.payments.status",
      "payment_collections.payments.amount",
      "payment_collections.payments.raw_amount",
      "payment_collections.payments.currency_code",
      "payment_collections.payments.captured_at",
      "payment_collections.payments.captures.amount",
      "payment_collections.payments.captures.raw_amount",
      "payment_collections.payment_sessions.provider_id",
      "payment_collections.payment_sessions.status",
    ],
    filters: { id: orderId },
    options: { throwIfKeyNotFound: false },
  } as never)) as { data?: CancellationOrder[] }
  return data?.[0] ?? null
}

const orderUsesStripePayment = (order: CancellationOrder) => {
  for (const collection of order.payment_collections ?? []) {
    for (const session of collection.payment_sessions ?? []) {
      const providerId = (session as { provider_id?: unknown }).provider_id
      if (typeof providerId === "string" && providerId.includes("stripe")) {
        return true
      }
    }
  }
  return false
}

const persistPayoutMetadata = async (
  container: MedusaContainer,
  orderId: string,
  metadata: Record<string, unknown>,
  result: SellerPayoutResult
) => {
  const orderModule = container.resolve(Modules.ORDER)
  await orderModule.updateOrders(orderId, {
    metadata: {
      ...metadata,
      [ORDER_META_SELLER_PAYOUT_STATUS]: result.status,
      [ORDER_META_SELLER_PAYOUT_TRANSFER_ID]: result.transfer_id ?? null,
      [ORDER_META_SELLER_PAYOUT_AT]: result.status === "completed" ? new Date().toISOString() : metadata[ORDER_META_SELLER_PAYOUT_AT] ?? null,
      [ORDER_META_SELLER_PAYOUT_AMOUNT]: result.amount ?? null,
      [ORDER_META_SELLER_PAYOUT_ERROR]: result.error ?? null,
    },
  } as never)
}

export async function releaseSellerPayout(
  container: MedusaContainer,
  orderId: string,
  source: "buyer_confirm" | "auto_confirm" | "onboarding_retry" = "buyer_confirm"
): Promise<SellerPayoutResult> {
  const order = await loadOrderForPayout(container, orderId)
  if (!order) {
    return { status: "failed", error: "Order not found for payout" }
  }

  const metadata = { ...(order.metadata ?? {}) }
  const existingStatus = typeof metadata[ORDER_META_SELLER_PAYOUT_STATUS] === "string"
    ? metadata[ORDER_META_SELLER_PAYOUT_STATUS]
    : null
  if (existingStatus === "completed" || metadata[ORDER_META_SELLER_PAYOUT_TRANSFER_ID]) {
    return {
      status: "skipped_already_paid",
      transfer_id: typeof metadata[ORDER_META_SELLER_PAYOUT_TRANSFER_ID] === "string"
        ? metadata[ORDER_META_SELLER_PAYOUT_TRANSFER_ID]
        : null,
      amount: typeof metadata[ORDER_META_SELLER_PAYOUT_AMOUNT] === "number"
        ? metadata[ORDER_META_SELLER_PAYOUT_AMOUNT]
        : null,
    }
  }

  if (!isStripeConfigured() || !orderUsesStripePayment(order)) {
    const result: SellerPayoutResult = { status: "skipped_no_stripe" }
    await persistPayoutMetadata(container, orderId, metadata, result)
    return result
  }

  const storeId = readOrderStoreId(order)
  if (!storeId) {
    const result: SellerPayoutResult = { status: "failed", error: "Order store_id missing" }
    await persistPayoutMetadata(container, orderId, metadata, result)
    return result
  }

  const storeCore = container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService
  const stores = await storeCore.listStores({ id: storeId })
  const store = stores[0] as { stripe_account_id?: string | null } | undefined
  const stripeAccountId = store?.stripe_account_id ?? null

  if (!stripeAccountId) {
    const result: SellerPayoutResult = { status: "pending_account" }
    await persistPayoutMetadata(container, orderId, metadata, result)
    try {
      await createStoreNotification(storeCore, {
        store_id: storeId,
        type: "order_paid",
        title: "收款账号未绑定",
        body: `订单 ${order.display_id != null ? `#${order.display_id}` : orderId} 买家已确认收货，请绑定 Stripe 收款账号后款项才会到账。`,
        metadata: { order_id: orderId, payout_status: "pending_account", source },
      })
    } catch {
      // notification is best-effort
    }
    return result
  }

  let accountReady = false
  try {
    const account = await retrieveConnectAccount(stripeAccountId)
    accountReady = isConnectAccountReady(account)
  } catch (error) {
    const result: SellerPayoutResult = {
      status: "failed",
      error: error instanceof Error ? error.message : "Unable to read seller Stripe account",
    }
    await persistPayoutMetadata(container, orderId, metadata, result)
    return result
  }

  if (!accountReady) {
    const result: SellerPayoutResult = { status: "pending_account" }
    await persistPayoutMetadata(container, orderId, metadata, result)
    return result
  }

  const refundable = resolveRefundableAmount(order)
  if (!refundable || refundable.amount <= 0) {
    const result: SellerPayoutResult = { status: "failed", error: "No captured payment amount found" }
    await persistPayoutMetadata(container, orderId, metadata, result)
    return result
  }

  const transferAmount = readMinorAmount(refundable.amount)
  if (transferAmount <= 0) {
    const result: SellerPayoutResult = { status: "failed", error: "Transfer amount must be greater than zero" }
    await persistPayoutMetadata(container, orderId, metadata, result)
    return result
  }

  try {
    const transfer = await stripeApiRequest<{ id: string }>("/transfers", {
      method: "POST",
      idempotencyKey: `seller_payout_${orderId}`,
      params: {
        amount: transferAmount,
        currency: refundable.currencyCode,
        destination: stripeAccountId,
        "metadata[order_id]": orderId,
        "metadata[store_id]": storeId,
        "metadata[payout_source]": source,
      },
    })

    const result: SellerPayoutResult = {
      status: "completed",
      transfer_id: transfer.id,
      amount: transferAmount,
      currency_code: refundable.currencyCode,
    }
    await persistPayoutMetadata(container, orderId, metadata, result)

    try {
      await createStoreNotification(storeCore, {
        store_id: storeId,
        type: "order_paid",
        title: "订单款项已到账",
        body: `订单 ${order.display_id != null ? `#${order.display_id}` : orderId} 买家确认收货后，$${(transferAmount / 100).toFixed(2)} 已转入您的 Stripe 收款账号。`,
        metadata: {
          order_id: orderId,
          payout_status: "completed",
          transfer_id: transfer.id,
          amount: transferAmount,
        },
      })
    } catch {
      // notification is best-effort
    }

    return result
  } catch (error) {
    const result: SellerPayoutResult = {
      status: "failed",
      error: error instanceof Error ? error.message : "Stripe transfer failed",
    }
    await persistPayoutMetadata(container, orderId, metadata, result)
    return result
  }
}

export async function retryPendingSellerPayoutsForStore(
  container: MedusaContainer,
  storeId: string
) {
  const orderModule = container.resolve(Modules.ORDER)
  const orders = (await orderModule.listOrders({}, {
    take: 500,
    order: { created_at: "DESC" },
  } as never)) as Array<{ id?: string; metadata?: Record<string, unknown> | null }>

  const pending = orders.filter((order) => {
    if (!order.id || readOrderStoreId(order) !== storeId) return false
    const status = order.metadata?.[ORDER_META_SELLER_PAYOUT_STATUS]
    return status === "pending_account" && !order.metadata?.[ORDER_META_SELLER_PAYOUT_TRANSFER_ID]
  })

  const results: SellerPayoutResult[] = []
  for (const order of pending) {
    if (!order.id) continue
    results.push(await releaseSellerPayout(container, order.id, "onboarding_retry"))
  }
  return results
}
