import type { CartDTO } from "@medusajs/types"
import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { deletePaymentSessionsWorkflow } from "@medusajs/core-flows"
import {
  createPaymentCollectionForCartWorkflow,
  createPaymentSessionsWorkflow,
} from "@medusajs/medusa/core-flows"
import { syncCartCheckoutPricing } from "./sync-cart-checkout-pricing"
import { assertInternalPaymentAmounts } from "./payment-amount-contract"

const PROCESSABLE_STATUSES = new Set([
  "pending",
  "requires_more",
  "authorized",
  "captured",
  "pending_authorization",
])

export type PaymentSessionRow = {
  id?: string
  status?: string
  provider_id?: string
  amount?: unknown
  currency_code?: string
  data?: Record<string, unknown> | null
}

type PaymentCollectionSnapshot = {
  id: string
  amount?: unknown
  currency_code?: string | null
}

async function readCartPaymentCollection(
  container: MedusaContainer,
  cartId: string
): Promise<PaymentCollectionSnapshot | null> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = (await query.graph({
    entity: "cart",
    fields: ["id", "payment_collection.id", "payment_collection.amount", "payment_collection.currency_code"],
    filters: { id: cartId },
  })) as { data: Array<{ payment_collection?: PaymentCollectionSnapshot | null }> }

  return data[0]?.payment_collection?.id ? data[0].payment_collection : null
}

export async function readCartPaymentCollectionId(
  container: MedusaContainer,
  cartId: string
): Promise<string | null> {
  return (await readCartPaymentCollection(container, cartId))?.id ?? null
}

export async function listPaymentSessions(
  container: MedusaContainer,
  paymentCollectionId: string
): Promise<PaymentSessionRow[]> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = (await query.graph({
    entity: "payment_session",
    fields: ["id", "status", "provider_id", "amount", "currency_code", "data"],
    filters: { payment_collection_id: paymentCollectionId },
  })) as { data: PaymentSessionRow[] }

  return data
}

export const selectPaymentSessionForProvider = (
  sessions: PaymentSessionRow[],
  providerId: string
) =>
  sessions.find(
    (session) =>
      session.provider_id === providerId &&
      typeof session.status === "string" &&
      PROCESSABLE_STATUSES.has(session.status)
  ) ??
  sessions.find((session) => session.provider_id === providerId) ??
  null

export async function findCartPaymentSession(
  container: MedusaContainer,
  cartId: string,
  providerId: string
): Promise<PaymentSessionRow | null> {
  const paymentCollectionId = await readCartPaymentCollectionId(container, cartId)
  if (!paymentCollectionId) return null
  const sessions = await listPaymentSessions(container, paymentCollectionId)
  return selectPaymentSessionForProvider(sessions, providerId)
}

/**
 * completeCartWorkflow 要求购物车已有 payment_collection，且存在可处理的 payment session。
 */
export async function ensureCartPaymentReady(
  container: MedusaContainer,
  cartId: string,
  providerId: string,
  existingProviderPaymentId?: string
): Promise<void> {
  const lockingModule = container.resolve(Modules.LOCKING) as {
    execute: <T>(key: string, job: () => Promise<T>, options?: { timeout?: number }) => Promise<T>
  }

  return lockingModule.execute(
    `checkout-payment-session:${cartId}:${providerId}`,
    async () => {
      const cartModule = container.resolve(Modules.CART)
      const pricing = await syncCartCheckoutPricing(container, cartId)

      let paymentCollection = await readCartPaymentCollection(container, cartId)
      let paymentCollectionId = paymentCollection?.id ?? null

      if (!paymentCollectionId) {
        await createPaymentCollectionForCartWorkflow(container).run({
          input: { cart_id: cartId },
        })
        paymentCollection = await readCartPaymentCollection(container, cartId)
        paymentCollectionId = paymentCollection?.id ?? null
      }

      if (!paymentCollectionId) {
        throw new Error("Failed to create payment collection for cart")
      }

      const sessions = await listPaymentSessions(container, paymentCollectionId)
      const processableSession = selectPaymentSessionForProvider(
        sessions.filter((session) => PROCESSABLE_STATUSES.has(session.status ?? "")),
        providerId
      )
      if (processableSession) {
        assertInternalPaymentAmounts({
          cartTotal: pricing.payableTotal,
          collectionAmount: paymentCollection?.amount,
          sessionAmount: processableSession.amount,
          currencyCode: pricing.currencyCode,
          collectionCurrency: paymentCollection?.currency_code,
          sessionCurrency: processableSession.currency_code,
        })
        return
      }

      // Stale error/canceled sessions for this provider block Medusa's
      // complete-cart validator (it only accepts processable statuses). Remove
      // them before recreating, optionally reusing the external PayPal order.
      const staleSessionIds = sessions
        .filter((session) => session.provider_id === providerId && session.id)
        .map((session) => session.id as string)
      if (staleSessionIds.length) {
        await deletePaymentSessionsWorkflow(container).run({
          input: { ids: staleSessionIds },
        })
      }

      const cart = await cartModule.retrieveCart(cartId)
      await createPaymentSessionsWorkflow(container).run({
        input: {
          payment_collection_id: paymentCollectionId,
          provider_id: providerId,
          // PayPal Checkout does not use Medusa account holders. Passing a
          // customer here makes the generic workflow attempt to create one;
          // Stripe still receives the customer context as before.
          customer_id: providerId === "pp_paypal_paypal" ? undefined : cart.customer_id ?? undefined,
          // If Medusa lost only the session row, let the provider reuse the
          // existing external payment instead of creating a second one.
          data:
            providerId === "pp_paypal_paypal" && existingProviderPaymentId
              ? { paypal_order_id: existingProviderPaymentId }
              : undefined,
          context: {},
        },
      })

      paymentCollection = await readCartPaymentCollection(container, cartId)
      const createdSession = selectPaymentSessionForProvider(
        await listPaymentSessions(container, paymentCollectionId),
        providerId
      )
      if (!createdSession) throw new Error("Failed to create payment session for cart")
      assertInternalPaymentAmounts({
        cartTotal: pricing.payableTotal,
        collectionAmount: paymentCollection?.amount,
        sessionAmount: createdSession.amount,
        currencyCode: pricing.currencyCode,
        collectionCurrency: paymentCollection?.currency_code,
        sessionCurrency: createdSession.currency_code,
      })

      // PayPal's Medusa-session/attempt metadata is attached by the payment
      // recovery route after it has selected the one active checkout attempt.
      // Doing it here as well races provider switches and can target a session
      // that Medusa has just removed.
    },
    { timeout: 30 }
  )
}

export type CartWithPaymentCollection = CartDTO & {
  payment_collection?: { id?: string } | null
}
