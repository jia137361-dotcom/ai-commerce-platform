import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { createPaymentSessionsWorkflow } from "@medusajs/medusa/core-flows"
import { assertCartBelongsToCurrentStore } from "./assert-cart-store"
import { readCartPaymentCollectionId, listPaymentSessions } from "./ensure-cart-payment-ready"
import { resolvePayPalVaultPaymentMethod } from "./customer-payment-methods"

const PAYPAL_PROVIDER_ID = "pp_paypal_paypal"

export async function prepareCartWithSavedPayPalPaymentMethod(
  container: MedusaContainer,
  input: {
    req: Parameters<typeof assertCartBelongsToCurrentStore>[0]
    cartId: string
    customerId: string
    paymentMethodId: string
    providerId?: string
  }
) {
  const providerId = input.providerId === PAYPAL_PROVIDER_ID ? input.providerId : PAYPAL_PROVIDER_ID
  const cartModule = container.resolve(Modules.CART)
  const cart = await cartModule.retrieveCart(input.cartId, { relations: ["payment_collection"] })
  assertCartBelongsToCurrentStore(input.req, cart)
  if (cart.customer_id && cart.customer_id !== input.customerId) {
    throw new Error("This cart belongs to a different customer")
  }

  const method = await resolvePayPalVaultPaymentMethod(container, input.customerId, input.paymentMethodId)
  const paymentCollectionId = await readCartPaymentCollectionId(container, input.cartId)
  if (!paymentCollectionId) throw new Error("Payment collection is missing for this cart")
  const sessions = await listPaymentSessions(container, paymentCollectionId)
  const paypalSessionIds = sessions
    .filter((session) => session.provider_id === providerId && session.id)
    .map((session) => session.id as string)
  if (paypalSessionIds.length) {
    const paymentModule = container.resolve(Modules.PAYMENT) as {
      deletePaymentSession: (id: string) => Promise<unknown>
    }
    await Promise.all(paypalSessionIds.map((sessionId) => paymentModule.deletePaymentSession(sessionId)))
  }

  await createPaymentSessionsWorkflow(container).run({
    input: {
      payment_collection_id: paymentCollectionId,
      provider_id: providerId,
      data: { paypal_vault_id: method.vault_id },
      context: {},
    },
  })

  return { providerId, paymentMethodLabel: method.label || "PayPal account" }
}
