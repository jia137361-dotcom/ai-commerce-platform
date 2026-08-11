import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { formatStripePaymentMethodLabel } from "./stripe-payment-method-label"
import { isStripeConfigured, stripeApiRequest } from "./stripe-client"

const STRIPE_CUSTOMER_METADATA_KEY = "stripe_customer_id"
const DEFAULT_PAYMENT_METHOD_METADATA_KEY = "default_payment_method_id"

type StripeCard = {
  brand?: string
  last4?: string
  exp_month?: number
  exp_year?: number
  wallet?: { type?: string | null } | null
}

type StripePaymentMethod = {
  id: string
  type?: string
  card?: StripeCard | null
  billing_details?: {
    name?: string | null
    email?: string | null
  } | null
}

type StripeListResponse = {
  data: StripePaymentMethod[]
}

type StripeSetupIntent = {
  id: string
  client_secret?: string | null
}

type StripeCustomer = {
  id: string
}

export type CustomerPaymentMethodRecord = {
  id: string
  type: string
  brand?: string
  last4?: string
  expMonth?: number
  expYear?: number
  walletType?: string | null
  isDefault: boolean
  label: string
}

const formatPaymentMethodLabel = (method: StripePaymentMethod) => formatStripePaymentMethodLabel(method)

const normalizePaymentMethod = (
  method: StripePaymentMethod,
  defaultPaymentMethodId?: string | null
): CustomerPaymentMethodRecord => ({
  id: method.id,
  type: method.type ?? "card",
  brand: method.card?.brand ?? undefined,
  last4: method.card?.last4 ?? undefined,
  expMonth: method.card?.exp_month,
  expYear: method.card?.exp_year,
  walletType: method.card?.wallet?.type ?? null,
  isDefault: Boolean(defaultPaymentMethodId && method.id === defaultPaymentMethodId),
  label: formatPaymentMethodLabel(method),
})

const getCustomerModule = (container: MedusaContainer) =>
  container.resolve(Modules.CUSTOMER) as {
    retrieveCustomer: (id: string) => Promise<{
      id: string
      email?: string | null
      first_name?: string | null
      last_name?: string | null
      metadata?: Record<string, unknown> | null
    }>
    updateCustomers: (id: string, data: { metadata: Record<string, unknown> }) => Promise<unknown>
  }

export async function ensureStripeCustomerId(container: MedusaContainer, customerId: string) {
  if (!isStripeConfigured()) {
    throw new Error("Stripe is not configured on the server")
  }

  const customerModule = getCustomerModule(container)
  const customer = await customerModule.retrieveCustomer(customerId)
  const metadata = { ...(customer.metadata ?? {}) }
  const existingId =
    typeof metadata[STRIPE_CUSTOMER_METADATA_KEY] === "string"
      ? metadata[STRIPE_CUSTOMER_METADATA_KEY]
      : null

  if (existingId) {
    try {
      await stripeApiRequest<StripeCustomer>(`/customers/${existingId}`)
      return existingId
    } catch {
      delete metadata[STRIPE_CUSTOMER_METADATA_KEY]
      delete metadata[DEFAULT_PAYMENT_METHOD_METADATA_KEY]
    }
  }

  const email = typeof customer.email === "string" ? customer.email.trim() : undefined
  const name = [customer.first_name, customer.last_name].filter(Boolean).join(" ").trim()
  const created = await stripeApiRequest<StripeCustomer>("/customers", {
    method: "POST",
    params: {
      email,
      name: name || undefined,
      "metadata[medusa_customer_id]": customerId,
    },
  })

  await customerModule.updateCustomers(customerId, {
    metadata: {
      ...metadata,
      [STRIPE_CUSTOMER_METADATA_KEY]: created.id,
    },
  })

  return created.id
}

export async function listCustomerPaymentMethodRecords(container: MedusaContainer, customerId: string) {
  if (!isStripeConfigured()) {
    return {
      stripeConfigured: false,
      paymentMethods: [] as CustomerPaymentMethodRecord[],
      defaultPaymentMethodId: null as string | null,
    }
  }

  const customerModule = getCustomerModule(container)
  const customer = await customerModule.retrieveCustomer(customerId)
  const stripeCustomerId =
    typeof customer.metadata?.[STRIPE_CUSTOMER_METADATA_KEY] === "string"
      ? customer.metadata[STRIPE_CUSTOMER_METADATA_KEY]
      : null
  const defaultPaymentMethodId =
    typeof customer.metadata?.[DEFAULT_PAYMENT_METHOD_METADATA_KEY] === "string"
      ? customer.metadata[DEFAULT_PAYMENT_METHOD_METADATA_KEY]
      : null

  if (!stripeCustomerId) {
    return {
      stripeConfigured: true,
      paymentMethods: [],
      defaultPaymentMethodId,
    }
  }

  const payload = await stripeApiRequest<StripeListResponse>(
    `/customers/${stripeCustomerId}/payment_methods`,
    {
      method: "GET",
      params: { type: "card", limit: 20 },
    }
  )

  return {
    stripeConfigured: true,
    paymentMethods: (payload.data ?? []).map((method) =>
      normalizePaymentMethod(method, defaultPaymentMethodId)
    ),
    defaultPaymentMethodId,
  }
}

export async function createCustomerPaymentMethodSetupIntent(
  container: MedusaContainer,
  customerId: string
) {
  const stripeCustomerId = await ensureStripeCustomerId(container, customerId)
  const setupIntent = await stripeApiRequest<StripeSetupIntent>("/setup_intents", {
    method: "POST",
    params: {
      customer: stripeCustomerId,
      "automatic_payment_methods[enabled]": true,
      "automatic_payment_methods[allow_redirects]": "never",
      usage: "off_session",
    },
  })

  if (!setupIntent.client_secret?.includes("_secret_")) {
    throw new Error("Stripe did not return a valid setup client secret")
  }

  return {
    setupIntentId: setupIntent.id,
    clientSecret: setupIntent.client_secret,
  }
}

export async function detachCustomerPaymentMethod(
  container: MedusaContainer,
  customerId: string,
  paymentMethodId: string
) {
  const customerModule = getCustomerModule(container)
  const customer = await customerModule.retrieveCustomer(customerId)
  const stripeCustomerId =
    typeof customer.metadata?.[STRIPE_CUSTOMER_METADATA_KEY] === "string"
      ? customer.metadata[STRIPE_CUSTOMER_METADATA_KEY]
      : null

  if (!stripeCustomerId) {
    throw new Error("No saved payment methods were found for this account")
  }

  const methods = await listCustomerPaymentMethodRecords(container, customerId)
  if (!methods.paymentMethods.some((method) => method.id === paymentMethodId)) {
    throw new Error("Payment method not found on this account")
  }

  await stripeApiRequest(`/payment_methods/${paymentMethodId}/detach`, { method: "POST" })

  const metadata = { ...(customer.metadata ?? {}) }
  if (metadata[DEFAULT_PAYMENT_METHOD_METADATA_KEY] === paymentMethodId) {
    metadata[DEFAULT_PAYMENT_METHOD_METADATA_KEY] = null
  }
  await customerModule.updateCustomers(customerId, { metadata })

  return listCustomerPaymentMethodRecords(container, customerId)
}

export async function setDefaultCustomerPaymentMethod(
  container: MedusaContainer,
  customerId: string,
  paymentMethodId: string
) {
  const customerModule = getCustomerModule(container)
  const methods = await listCustomerPaymentMethodRecords(container, customerId)
  if (!methods.paymentMethods.some((method) => method.id === paymentMethodId)) {
    throw new Error("Payment method not found on this account")
  }

  const customer = await customerModule.retrieveCustomer(customerId)
  const stripeCustomerId =
    typeof customer.metadata?.[STRIPE_CUSTOMER_METADATA_KEY] === "string"
      ? customer.metadata[STRIPE_CUSTOMER_METADATA_KEY]
      : null
  if (!stripeCustomerId) {
    throw new Error("Stripe customer is not linked to this account")
  }

  await stripeApiRequest(`/customers/${stripeCustomerId}`, {
    method: "POST",
    params: {
      "invoice_settings[default_payment_method]": paymentMethodId,
    },
  })

  await customerModule.updateCustomers(customerId, {
    metadata: {
      ...(customer.metadata ?? {}),
      [DEFAULT_PAYMENT_METHOD_METADATA_KEY]: paymentMethodId,
    },
  })

  return listCustomerPaymentMethodRecords(container, customerId)
}
