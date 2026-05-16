import type { CartDTO } from "@medusajs/types"
import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
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

export type CartWithPaymentCollection = CartDTO & {
  payment_collection?: {
    id?: string
    payment_sessions?: Array<{ status?: string; provider_id?: string }>
  } | null
}

function hasProcessableSessionForProvider(
  cart: CartWithPaymentCollection,
  providerId: string
): boolean {
  const sessions = cart.payment_collection?.payment_sessions ?? []
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

  let cart = (await cartModule.retrieveCart(cartId, {
    relations: ["payment_collection", "payment_collection.payment_sessions"],
  })) as CartWithPaymentCollection

  if (!cart.payment_collection?.id) {
    await createPaymentCollectionForCartWorkflow(container).run({
      input: { cart_id: cartId },
    })
    cart = (await cartModule.retrieveCart(cartId, {
      relations: ["payment_collection", "payment_collection.payment_sessions"],
    })) as CartWithPaymentCollection
  }

  if (!hasProcessableSessionForProvider(cart, providerId)) {
    await createPaymentSessionsWorkflow(container).run({
      input: {
        payment_collection_id: cart.payment_collection!.id!,
        provider_id: providerId,
        customer_id: cart.customer_id ?? undefined,
        context: {},
      },
    })
  }
}
