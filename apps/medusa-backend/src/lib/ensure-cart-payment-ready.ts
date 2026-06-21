import type { CartDTO } from "@medusajs/types"
import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createPaymentCollectionForCartWorkflow,
  createPaymentSessionsWorkflow,
} from "@medusajs/medusa/core-flows"

const PROCESSABLE_STATUSES = new Set([
  "pending",
  "requires_more",
  "authorized",
  "captured",
])

export type PaymentSessionRow = {
  id?: string
  status?: string
  provider_id?: string
  data?: Record<string, unknown> | null
}

export async function readCartPaymentCollectionId(
  container: MedusaContainer,
  cartId: string
): Promise<string | null> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = (await query.graph({
    entity: "cart",
    fields: ["id", "payment_collection.id"],
    filters: { id: cartId },
  })) as { data: Array<{ payment_collection?: { id?: string } | null }> }

  return data[0]?.payment_collection?.id ?? null
}

export async function listPaymentSessions(
  container: MedusaContainer,
  paymentCollectionId: string
): Promise<PaymentSessionRow[]> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = (await query.graph({
    entity: "payment_session",
    fields: ["id", "status", "provider_id", "data"],
    filters: { payment_collection_id: paymentCollectionId },
  })) as { data: PaymentSessionRow[] }

  return data
}

export async function findCartPaymentSession(
  container: MedusaContainer,
  cartId: string,
  providerId: string
): Promise<PaymentSessionRow | null> {
  const paymentCollectionId = await readCartPaymentCollectionId(container, cartId)
  if (!paymentCollectionId) return null
  const sessions = await listPaymentSessions(container, paymentCollectionId)
  return sessions.find((session) => session.provider_id === providerId) ?? null
}

function hasProcessableSessionForProvider(
  sessions: PaymentSessionRow[],
  providerId: string
): boolean {
  return sessions.some(
    (s) =>
      typeof s.status === "string" &&
      PROCESSABLE_STATUSES.has(s.status) &&
      s.provider_id === providerId
  )
}

/**
 * completeCartWorkflow 要求购物车已有 payment_collection，且存在可处理的 payment session。
 */
export async function ensureCartPaymentReady(
  container: MedusaContainer,
  cartId: string,
  providerId: string
): Promise<void> {
  const cartModule = container.resolve(Modules.CART)

  let paymentCollectionId = await readCartPaymentCollectionId(container, cartId)

  if (!paymentCollectionId) {
    await createPaymentCollectionForCartWorkflow(container).run({
      input: { cart_id: cartId },
    })
    paymentCollectionId = await readCartPaymentCollectionId(container, cartId)
  }

  if (!paymentCollectionId) {
    throw new Error("Failed to create payment collection for cart")
  }

  const sessions = await listPaymentSessions(container, paymentCollectionId)
  if (hasProcessableSessionForProvider(sessions, providerId)) {
    return
  }

  const cart = await cartModule.retrieveCart(cartId)
  await createPaymentSessionsWorkflow(container).run({
    input: {
      payment_collection_id: paymentCollectionId,
      provider_id: providerId,
      customer_id: cart.customer_id ?? undefined,
      context: {},
    },
  })
}

export type CartWithPaymentCollection = CartDTO & {
  payment_collection?: { id?: string } | null
}
