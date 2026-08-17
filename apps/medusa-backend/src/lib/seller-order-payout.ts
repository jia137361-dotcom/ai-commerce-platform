import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  ORDER_META_SELLER_PAYOUT_AMOUNT,
  ORDER_META_SELLER_PAYOUT_AT,
  ORDER_META_SELLER_PAYOUT_CURRENCY,
  ORDER_META_SELLER_PAYOUT_ERROR,
  ORDER_META_SELLER_PAYOUT_STATUS,
  ORDER_META_SELLER_PAYOUT_TRANSFER_ID,
} from "./order-custom-metadata"
import type { CancellationOrder } from "./order-cancellation"
import { readOrderStoreId } from "./order-store-context"
import { isConnectAccountReady, retrieveConnectAccount } from "./seller-stripe-connect"
import { isStripeConfigured, stripeApiRequest } from "./stripe-client"
import { readPaymentAttemptPaymentIntentId } from "./checkout-payment-attempts"
import { STORE_CORE_MODULE } from "../modules/store-core"
import type StoreCoreModuleService from "../modules/store-core/service"
import { createStoreNotification } from "./notifications"
import { majorToProviderMinor, normalizeMajor } from "./money"

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
      "payment_collections.payment_sessions.data",
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

type StripePaymentIntentForTransfer = {
  latest_charge?: string | { id?: string | null } | null
}

type StripeChargeForTransfer = {
  balance_transaction?: string | { id?: string | null } | null
}

type StripeBalanceTransactionForTransfer = {
  currency?: string | null
}

const readAmount = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  if (value && typeof value === "object") {
    const candidate = value as { value?: unknown; numeric?: unknown }
    return readAmount(candidate.value ?? candidate.numeric)
  }
  return 0
}

const resolveCapturedPayout = (order: CancellationOrder) => {
  const orderCurrencyValue = (order as CancellationOrder & { currency_code?: unknown }).currency_code
  const orderCurrency = typeof orderCurrencyValue === "string" ? orderCurrencyValue.toLowerCase() : null
  for (const collection of order.payment_collections ?? []) {
    const currency = typeof collection.currency_code === "string"
      ? collection.currency_code.toLowerCase()
      : orderCurrency
    const collectionCaptured = readAmount((collection as Record<string, unknown>).captured_amount)
    if (collectionCaptured > 0 && currency) {
      return { amount: normalizeMajor(collectionCaptured, currency), currency }
    }
    for (const payment of collection.payments ?? []) {
      const paymentCurrency = typeof payment.currency_code === "string"
        ? payment.currency_code.toLowerCase()
        : currency
      const captures = payment.captures ?? []
      const captured = captures.reduce(
        (sum, capture) => sum + readAmount(capture.amount ?? capture.raw_amount),
        0
      )
      const paymentCaptured = captured > 0
        ? captured
        : payment.captured_at
          ? readAmount(payment.amount ?? payment.raw_amount)
          : 0
      if (paymentCaptured > 0 && paymentCurrency) {
        return { amount: normalizeMajor(paymentCaptured, paymentCurrency), currency: paymentCurrency }
      }
    }
  }
  return null
}

const readLatestChargeId = (intent: StripePaymentIntentForTransfer) => {
  const value = intent.latest_charge
  if (typeof value === "string" && value.startsWith("ch_")) return value
  if (value && typeof value === "object" && typeof value.id === "string" && value.id.startsWith("ch_")) return value.id
  return null
}

const readStripeResourceId = (value: string | { id?: string | null } | null | undefined, prefix: string) => {
  if (typeof value === "string" && value.startsWith(prefix)) return value
  if (value && typeof value === "object" && typeof value.id === "string" && value.id.startsWith(prefix)) return value.id
  return null
}

const resolveOrderStripeCharge = async (order: CancellationOrder) => {
  for (const collection of order.payment_collections ?? []) {
    for (const session of collection.payment_sessions ?? []) {
      if (typeof session.provider_id !== "string" || !session.provider_id.includes("stripe")) continue
      const paymentIntentId = readPaymentAttemptPaymentIntentId(session)
      if (!paymentIntentId) continue
      const intent = await stripeApiRequest<StripePaymentIntentForTransfer>(`/payment_intents/${paymentIntentId}`)
      const chargeId = readLatestChargeId(intent)
      if (!chargeId) continue
      const charge = await stripeApiRequest<StripeChargeForTransfer>(`/charges/${chargeId}`)
      const balanceTransactionId = readStripeResourceId(charge.balance_transaction, "txn_")
      if (!balanceTransactionId) continue
      const balanceTransaction = await stripeApiRequest<StripeBalanceTransactionForTransfer>(
        `/balance_transactions/${balanceTransactionId}`
      )
      const currency = typeof balanceTransaction.currency === "string"
        ? balanceTransaction.currency.toLowerCase()
        : null
      if (currency) return { id: chargeId, currency }
    }
  }
  return null
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
      [ORDER_META_SELLER_PAYOUT_CURRENCY]: result.currency_code ?? null,
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

  const capturedPayout = resolveCapturedPayout(order)
  if (!capturedPayout) {
    const result: SellerPayoutResult = {
      status: "failed",
      error: "Captured payment amount is unavailable for this order; seller payout was not created.",
    }
    await persistPayoutMetadata(container, orderId, metadata, result)
    return result
  }

  let sourceTransaction: { id: string; currency: string } | null = null
  try {
    sourceTransaction = await resolveOrderStripeCharge(order)
  } catch (error) {
    const result: SellerPayoutResult = {
      status: "failed",
      error: error instanceof Error ? error.message : "Unable to read the Stripe charge for this order",
    }
    await persistPayoutMetadata(container, orderId, metadata, result)
    return result
  }
  if (!sourceTransaction) {
    const result: SellerPayoutResult = {
      status: "failed",
      error: "Stripe charge is unavailable for this order; seller payout was not created.",
    }
    await persistPayoutMetadata(container, orderId, metadata, result)
    return result
  }
  if (sourceTransaction.currency !== capturedPayout.currency) {
    const result: SellerPayoutResult = {
      status: "failed",
      error: "Stripe charge currency does not match the captured order payment.",
    }
    await persistPayoutMetadata(container, orderId, metadata, result)
    return result
  }

  try {
    const transferAmountMinor = majorToProviderMinor(
      capturedPayout.amount,
      capturedPayout.currency
    )
    const transfer = await stripeApiRequest<{ id: string }>("/transfers", {
      method: "POST",
      idempotencyKey: `seller_payout_${orderId}_${stripeAccountId}_${sourceTransaction.id}_${capturedPayout.currency}_${transferAmountMinor}`,
      params: {
        amount: transferAmountMinor,
        currency: capturedPayout.currency,
        destination: stripeAccountId,
        source_transaction: sourceTransaction.id,
        transfer_group: `order_${orderId}`,
        "metadata[order_id]": orderId,
        "metadata[store_id]": storeId,
        "metadata[payout_source]": source,
      },
    })

    const result: SellerPayoutResult = {
      status: "completed",
      transfer_id: transfer.id,
      amount: capturedPayout.amount,
      currency_code: capturedPayout.currency,
    }
    await persistPayoutMetadata(container, orderId, metadata, result)

    try {
      await createStoreNotification(storeCore, {
        store_id: storeId,
        type: "order_paid",
        title: "订单款项已到账",
        body: `订单 ${order.display_id != null ? `#${order.display_id}` : orderId} 买家确认收货后，${capturedPayout.currency.toUpperCase()} ${capturedPayout.amount.toFixed(2)} 已转入您的 Stripe 收款账号。`,
        metadata: {
          order_id: orderId,
          payout_status: "completed",
          transfer_id: transfer.id,
          amount: capturedPayout.amount,
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
    const error = order.metadata?.[ORDER_META_SELLER_PAYOUT_ERROR]
    const retryablePayoutFailure =
      status === "failed" &&
      typeof error === "string" &&
      (error.toLowerCase().includes("restricted outside of your platform's region") ||
        error.toLowerCase().includes("insufficient available funds") ||
        error.toLowerCase().includes("idempotent requests can only be used") ||
        error.toLowerCase().includes("currency of source_transaction"))
    return (status === "pending_account" || retryablePayoutFailure) && !order.metadata?.[ORDER_META_SELLER_PAYOUT_TRANSFER_ID]
  })

  const results: SellerPayoutResult[] = []
  for (const order of pending) {
    if (!order.id) continue
    results.push(await releaseSellerPayout(container, order.id, "onboarding_retry"))
  }
  return results
}
