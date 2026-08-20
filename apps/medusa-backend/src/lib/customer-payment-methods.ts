import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { formatStripePaymentMethodLabel } from "./stripe-payment-method-label"
import { isStripeConfigured, stripeApiRequest } from "./stripe-client"
import { getConfiguredPayPalClient } from "../modules/paypal/client"

const STRIPE_CUSTOMER_METADATA_KEY = "stripe_customer_id"
const DEFAULT_PAYMENT_METHOD_METADATA_KEY = "default_payment_method_id"
const PAYPAL_VAULT_PAYMENT_METHODS_METADATA_KEY = "paypal_vault_payment_methods"
const PAYPAL_VAULT_DEFAULT_PAYMENT_METHOD_METADATA_KEY = "paypal_vault_default_payment_method_id"
const PAYPAL_VAULT_PENDING_SETUP_TOKEN_METADATA_KEY = "paypal_vault_pending_setup_token_id"

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
  provider: "stripe" | "paypal"
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
  provider: "stripe",
  type: method.type ?? "card",
  brand: method.card?.brand ?? undefined,
  last4: method.card?.last4 ?? undefined,
  expMonth: method.card?.exp_month,
  expYear: method.card?.exp_year,
  walletType: method.card?.wallet?.type ?? null,
  isDefault: Boolean(defaultPaymentMethodId && method.id === defaultPaymentMethodId),
  label: formatPaymentMethodLabel(method),
})

type StoredPayPalVaultPaymentMethod = {
  id: string
  vault_id: string
  label?: string
  email?: string
  payer_id?: string
  created_at?: string
}

const readStoredPayPalVaultPaymentMethods = (metadata?: Record<string, unknown> | null) => {
  const raw = metadata?.[PAYPAL_VAULT_PAYMENT_METHODS_METADATA_KEY]
  if (!Array.isArray(raw)) return [] as StoredPayPalVaultPaymentMethod[]
  return raw.filter((value): value is StoredPayPalVaultPaymentMethod => {
    if (!value || typeof value !== "object") return false
    const candidate = value as Partial<StoredPayPalVaultPaymentMethod>
    return Boolean(candidate.id && candidate.vault_id)
  })
}

export const resolvePayPalPayoutEmailFromMetadata = (metadata?: Record<string, unknown> | null) => {
  const methods = readStoredPayPalVaultPaymentMethods(metadata)
  const defaultId = typeof metadata?.[PAYPAL_VAULT_DEFAULT_PAYMENT_METHOD_METADATA_KEY] === "string"
    ? metadata[PAYPAL_VAULT_DEFAULT_PAYMENT_METHOD_METADATA_KEY]
    : null
  const selected = methods.find((method) => method.id === defaultId) ?? methods[0]
  return selected?.email?.trim().toLowerCase() || null
}

export const resolvePayPalPayerIdFromMetadata = (metadata?: Record<string, unknown> | null) => {
  const methods = readStoredPayPalVaultPaymentMethods(metadata)
  const defaultId = typeof metadata?.[PAYPAL_VAULT_DEFAULT_PAYMENT_METHOD_METADATA_KEY] === "string"
    ? metadata[PAYPAL_VAULT_DEFAULT_PAYMENT_METHOD_METADATA_KEY]
    : null
  const selected = methods.find((method) => method.id === defaultId) ?? methods[0]
  return selected?.payer_id?.trim() || null
}

const normalizePayPalVaultPaymentMethod = (
  method: StoredPayPalVaultPaymentMethod,
  defaultPaymentMethodId?: string | null
): CustomerPaymentMethodRecord => ({
  id: method.id,
  provider: "paypal",
  type: "paypal",
  isDefault: Boolean(defaultPaymentMethodId && method.id === defaultPaymentMethodId),
  label: method.label || (method.email ? `PayPal (${method.email})` : "PayPal account"),
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
  const customerModule = getCustomerModule(container)
  const customer = await customerModule.retrieveCustomer(customerId)
  const paypalConfigured = Boolean(getConfiguredPayPalClient())
  const paypalDefaultPaymentMethodId =
    typeof customer.metadata?.[PAYPAL_VAULT_DEFAULT_PAYMENT_METHOD_METADATA_KEY] === "string"
      ? customer.metadata[PAYPAL_VAULT_DEFAULT_PAYMENT_METHOD_METADATA_KEY]
      : null
  const paypalMethods = paypalConfigured
    ? readStoredPayPalVaultPaymentMethods(customer.metadata).map((method) =>
        normalizePayPalVaultPaymentMethod(method, paypalDefaultPaymentMethodId)
      )
    : []

  if (!isStripeConfigured()) {
    return {
      stripeConfigured: false,
      paypalVaultConfigured: paypalConfigured,
      paymentMethods: paypalMethods,
      defaultPaymentMethodId: paypalDefaultPaymentMethodId,
    }
  }
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
      paypalVaultConfigured: paypalConfigured,
      paymentMethods: paypalMethods,
      defaultPaymentMethodId: defaultPaymentMethodId ?? paypalDefaultPaymentMethodId,
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
    paypalVaultConfigured: paypalConfigured,
    paymentMethods: [
      ...(payload.data ?? []).map((method) => normalizePaymentMethod(method, defaultPaymentMethodId)),
      ...paypalMethods,
    ],
    defaultPaymentMethodId,
  }
}

export async function createPayPalVaultSetup(container: MedusaContainer, customerId: string, origin?: string) {
  const client = getConfiguredPayPalClient()
  if (!client) throw new Error("PayPal Vault is not configured on the server")
  await getCustomerModule(container).retrieveCustomer(customerId)
  const base = origin && /^https?:\/\//i.test(origin)
    ? origin.replace(/\/+$/, "")
    : (process.env.STOREFRONT_BASE_URL || "http://127.0.0.1:5174").replace(/\/+$/, "")
  const setup = await client.createVaultSetupToken({
    returnUrl: `${base}/account/payment-methods`,
    cancelUrl: `${base}/account/payment-methods?paypal_vault_cancel=1`,
    requestId: `paypal-vault-setup:${customerId}:${Date.now()}`,
  })
  if (!setup.id) throw new Error("PayPal did not create a Vault setup token")
  const approvalUrl = setup.links?.find((link) => link.rel === "approve")?.href
  if (!setup.customer?.id) throw new Error("PayPal did not return a Vault customer id")
  const userIdToken = await client.createVaultUserIdToken({
    targetCustomerId: setup.customer.id,
  })
  if (!userIdToken.id_token) throw new Error("PayPal did not create a Vault user id token")
  const customerModule = getCustomerModule(container)
  const customer = await customerModule.retrieveCustomer(customerId)
  await customerModule.updateCustomers(customerId, {
    metadata: {
      ...(customer.metadata ?? {}),
      [PAYPAL_VAULT_PENDING_SETUP_TOKEN_METADATA_KEY]: setup.id,
    },
  })
  return {
    setupTokenId: setup.id,
    userIdToken: userIdToken.id_token,
    merchantId: client.getMerchantId(),
    approvalUrl,
  }
}

export async function completePayPalVaultSetup(
  container: MedusaContainer,
  customerId: string,
  setupTokenId: string
) {
  const client = getConfiguredPayPalClient()
  if (!client) throw new Error("PayPal Vault is not configured on the server")
  const customerModule = getCustomerModule(container)
  const customer = await customerModule.retrieveCustomer(customerId)
  if (customer.metadata?.[PAYPAL_VAULT_PENDING_SETUP_TOKEN_METADATA_KEY] !== setupTokenId) {
    throw new Error("PayPal authorization does not match this account")
  }
  const token = await client.createVaultPaymentToken(setupTokenId, `paypal-vault-complete:${customerId}:${setupTokenId}`)
  if (!token.id) throw new Error("PayPal did not return a Vault payment token")

  const stored = readStoredPayPalVaultPaymentMethods(customer.metadata)
  const existing = stored.find((method) => method.vault_id === token.id)
  const email = token.payment_source?.paypal?.email_address?.trim() || undefined
  const payerId = token.payment_source?.paypal?.payer_id?.trim() || undefined
  const record = {
    ...(existing ?? {}),
    id: existing?.id ?? `paypal_${crypto.randomUUID()}`,
    vault_id: token.id,
    label: email ? `PayPal (${email})` : existing?.label ?? "PayPal account",
    email: email ?? existing?.email,
    payer_id: payerId ?? existing?.payer_id,
    created_at: existing?.created_at ?? new Date().toISOString(),
  }
  const metadata = {
    ...(customer.metadata ?? {}),
    [PAYPAL_VAULT_PAYMENT_METHODS_METADATA_KEY]: existing
      ? stored.map((method) => method.vault_id === token.id ? record : method)
      : [...stored, record],
    [PAYPAL_VAULT_DEFAULT_PAYMENT_METHOD_METADATA_KEY]:
      typeof customer.metadata?.[PAYPAL_VAULT_DEFAULT_PAYMENT_METHOD_METADATA_KEY] === "string"
        ? customer.metadata[PAYPAL_VAULT_DEFAULT_PAYMENT_METHOD_METADATA_KEY]
        : record.id,
    [PAYPAL_VAULT_PENDING_SETUP_TOKEN_METADATA_KEY]: null,
  }
  await customerModule.updateCustomers(customerId, { metadata })
  return listCustomerPaymentMethodRecords(container, customerId)
}

export async function resolvePayPalVaultPaymentMethod(
  container: MedusaContainer,
  customerId: string,
  paymentMethodId: string
) {
  const customer = await getCustomerModule(container).retrieveCustomer(customerId)
  const method = readStoredPayPalVaultPaymentMethods(customer.metadata).find((item) => item.id === paymentMethodId)
  if (!method) throw new Error("PayPal payment method not found on this account")
  return method
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
  const paypalMethods = readStoredPayPalVaultPaymentMethods(customer.metadata)
  const paypalMethod = paypalMethods.find((method) => method.id === paymentMethodId)
  if (paypalMethod) {
    const client = getConfiguredPayPalClient()
    if (client) await client.deleteVaultPaymentToken(paypalMethod.vault_id, `paypal-vault-delete:${customerId}:${paymentMethodId}`)
    const metadata = { ...(customer.metadata ?? {}) }
    metadata[PAYPAL_VAULT_PAYMENT_METHODS_METADATA_KEY] = paypalMethods.filter((method) => method.id !== paymentMethodId)
    if (metadata[PAYPAL_VAULT_DEFAULT_PAYMENT_METHOD_METADATA_KEY] === paymentMethodId) {
      metadata[PAYPAL_VAULT_DEFAULT_PAYMENT_METHOD_METADATA_KEY] = null
    }
    await customerModule.updateCustomers(customerId, { metadata })
    return listCustomerPaymentMethodRecords(container, customerId)
  }
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
  if (methods.paymentMethods.find((method) => method.id === paymentMethodId)?.provider === "paypal") {
    await customerModule.updateCustomers(customerId, {
      metadata: {
        ...(customer.metadata ?? {}),
        [PAYPAL_VAULT_DEFAULT_PAYMENT_METHOD_METADATA_KEY]: paymentMethodId,
      },
    })
    return listCustomerPaymentMethodRecords(container, customerId)
  }
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
