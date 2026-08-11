import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { assertCartBelongsToCurrentStore } from "./assert-cart-store"
import {
  ensureCartPaymentReady,
  findCartPaymentSession,
  readCartPaymentCollectionId,
} from "./ensure-cart-payment-ready"
import {
  ensureStripeCustomerId,
  listCustomerPaymentMethodRecords,
} from "./customer-payment-methods"
import { stripeApiRequest } from "./stripe-client"
import {
  extractPaymentIntentIdFromClientSecret,
  formatStripePaymentMethodLabel,
} from "./stripe-payment-method-label"

const DEFAULT_STRIPE_PROVIDER = "pp_stripe_stripe"

type StripePaymentIntent = {
  id: string
  status?: string
  amount?: number
  currency?: string
  client_secret?: string | null
  customer?: string | { id?: string } | null
  metadata?: Record<string, string> | null
}

function readClientSecret(sessionData: Record<string, unknown> | null | undefined) {
  const secret = sessionData?.client_secret
  return typeof secret === "string" && secret.includes("_secret_") ? secret : null
}

function readPaymentIntentId(sessionData: Record<string, unknown> | null | undefined) {
  const direct = sessionData?.id
  if (typeof direct === "string" && direct.startsWith("pi_")) return direct
  const nested = sessionData?.payment_intent
  if (typeof nested === "string" && nested.startsWith("pi_")) return nested
  if (nested && typeof nested === "object" && typeof (nested as { id?: string }).id === "string") {
    const id = (nested as { id: string }).id
    if (id.startsWith("pi_")) return id
  }
  const secret = readClientSecret(sessionData)
  return secret ? extractPaymentIntentIdFromClientSecret(secret) : null
}

function readStripeCustomerId(customer: StripePaymentIntent["customer"]) {
  if (typeof customer === "string" && customer.startsWith("cus_")) return customer
  if (customer && typeof customer === "object" && typeof customer.id === "string" && customer.id.startsWith("cus_")) {
    return customer.id
  }
  return null
}

async function readPaymentCollectionTotals(container: MedusaContainer, paymentCollectionId: string) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = (await query.graph({
    entity: "payment_collection",
    fields: ["id", "amount", "currency_code"],
    filters: { id: paymentCollectionId },
  })) as { data: Array<{ amount?: number; currency_code?: string }> }

  const row = data[0]
  if (row?.amount == null || !row.currency_code) {
    throw new Error("Payment collection amount is missing for this cart")
  }
  return { amount: row.amount, currency_code: row.currency_code }
}

/**
 * Stripe rejects updating `customer` once a PaymentIntent already has one.
 * Align the intent to the buyer's Stripe customer (recreate session when needed).
 */
async function ensurePaymentIntentForSavedMethod(
  container: MedusaContainer,
  input: {
    cartId: string
    providerId: string
    stripeCustomerId: string
  }
) {
  let session = await findCartPaymentSession(container, input.cartId, input.providerId)
  if (!session?.id) {
    throw new Error("Stripe payment session is missing for this cart")
  }

  let paymentIntentId = readPaymentIntentId(session.data ?? undefined)
  if (!paymentIntentId) {
    throw new Error("Stripe payment intent is missing for this cart")
  }

  const existing = await stripeApiRequest<StripePaymentIntent>(`/payment_intents/${paymentIntentId}`)
  const currentCustomerId = readStripeCustomerId(existing.customer)

  if (!currentCustomerId) {
    await stripeApiRequest<StripePaymentIntent>(`/payment_intents/${paymentIntentId}`, {
      method: "POST",
      params: { customer: input.stripeCustomerId },
    })
    return { session, paymentIntentId }
  }

  if (currentCustomerId === input.stripeCustomerId) {
    return { session, paymentIntentId }
  }

  // Medusa's Stripe account_holder may have attached a different customer.
  // Cancel that session and recreate with the buyer's saved-card customer.
  const paymentCollectionId = await readCartPaymentCollectionId(container, input.cartId)
  if (!paymentCollectionId) {
    throw new Error("Payment collection is missing for this cart")
  }

  const totals = await readPaymentCollectionTotals(container, paymentCollectionId)
  const paymentModule = container.resolve(Modules.PAYMENT) as {
    deletePaymentSession: (id: string) => Promise<unknown>
    createPaymentSession: (
      paymentCollectionId: string,
      data: {
        provider_id: string
        amount: number
        currency_code: string
        context?: Record<string, unknown>
      }
    ) => Promise<{ id?: string; data?: Record<string, unknown> | null }>
  }

  await paymentModule.deletePaymentSession(session.id)
  const created = await paymentModule.createPaymentSession(paymentCollectionId, {
    provider_id: input.providerId,
    amount: totals.amount,
    currency_code: totals.currency_code,
    context: {
      account_holder: {
        data: { id: input.stripeCustomerId },
      },
    },
  })

  session = {
    id: created.id,
    data: created.data ?? null,
    provider_id: input.providerId,
  }
  paymentIntentId = readPaymentIntentId(session.data ?? undefined)
  if (!paymentIntentId) {
    throw new Error("Failed to recreate Stripe payment intent for saved card")
  }

  const recreated = await stripeApiRequest<StripePaymentIntent>(`/payment_intents/${paymentIntentId}`)
  if (!readStripeCustomerId(recreated.customer)) {
    await stripeApiRequest<StripePaymentIntent>(`/payment_intents/${paymentIntentId}`, {
      method: "POST",
      params: { customer: input.stripeCustomerId },
    })
  }

  return { session, paymentIntentId }
}

function resolveCheckoutReturnUrl(returnUrl?: string) {
  const candidate = returnUrl?.trim()
  if (candidate && /^https?:\/\//i.test(candidate)) return candidate
  const base = (process.env.STOREFRONT_BASE_URL || "http://127.0.0.1:5174").replace(/\/+$/, "")
  return `${base}/checkout`
}

export async function confirmCartWithSavedPaymentMethod(
  container: MedusaContainer,
  input: {
    req: Parameters<typeof assertCartBelongsToCurrentStore>[0]
    cartId: string
    customerId: string
    paymentMethodId: string
    providerId?: string
    returnUrl?: string
  }
) {
  const providerId = input.providerId?.startsWith("pp_stripe_")
    ? input.providerId
    : DEFAULT_STRIPE_PROVIDER
  const cartModule = container.resolve(Modules.CART)
  const cart = await cartModule.retrieveCart(input.cartId, {
    relations: ["payment_collection"],
  })
  assertCartBelongsToCurrentStore(input.req, cart)

  if (cart.customer_id && cart.customer_id !== input.customerId) {
    throw new Error("This cart belongs to a different customer")
  }

  const methods = await listCustomerPaymentMethodRecords(container, input.customerId)
  const saved = methods.paymentMethods.find((method) => method.id === input.paymentMethodId)
  if (!saved) {
    throw new Error("Payment method not found on this account")
  }

  const stripeCustomerId = await ensureStripeCustomerId(container, input.customerId)
  await ensureCartPaymentReady(container, input.cartId, providerId)

  const { session, paymentIntentId } = await ensurePaymentIntentForSavedMethod(container, {
    cartId: input.cartId,
    providerId,
    stripeCustomerId,
  })

  // PaymentIntents created with Dashboard automatic methods may include redirects.
  // Stripe requires return_url even when confirming a saved card on-session.
  const confirmed = await stripeApiRequest<StripePaymentIntent>(
    `/payment_intents/${paymentIntentId}/confirm`,
    {
      method: "POST",
      params: {
        payment_method: input.paymentMethodId,
        "off_session": false,
        return_url: resolveCheckoutReturnUrl(input.returnUrl),
      },
    }
  )

  const status = confirmed.status ?? ""
  if (!["succeeded", "processing", "requires_capture"].includes(status)) {
    throw new Error(`Saved-card payment is not ready (${status || "unknown"})`)
  }

  return {
    provider_id: providerId,
    payment_intent_id: confirmed.id,
    payment_intent_status: status,
    client_secret: confirmed.client_secret ?? readClientSecret(session.data ?? undefined),
    payment_method_id: input.paymentMethodId,
    payment_method_label: saved.label || formatStripePaymentMethodLabel({ id: saved.id, type: saved.type }),
  }
}
