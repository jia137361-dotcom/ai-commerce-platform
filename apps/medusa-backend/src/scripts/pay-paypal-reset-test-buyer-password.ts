import type { ExecArgs } from "./medusa-exec-args"
import { Modules } from "@medusajs/framework/utils"

const TARGET_CUSTOMER_ID = "cus_01KYXNV5932TGV6SKJ17F1J6T5"
const TARGET_BUYER_EMAIL = "mkt01_paypal_buyer_runtime_20260801_a@example.com"

type CustomerRecord = {
  id: string
  email?: string | null
}

type AuthIdentityRecord = {
  id: string
  app_metadata?: Record<string, unknown> | null
}

type ProviderIdentityRecord = {
  id: string
  provider?: string | null
  entity_id?: string | null
  auth_identity_id?: string | null
}

type AuthResponse = {
  success: boolean
  error?: string
  authIdentity?: AuthIdentityRecord
}

export default async function resetPayPalTestBuyerPassword({ container }: ExecArgs) {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("NODE_ENV=development is required")
  }
  if (process.env.PAY_PAYPAL_E2E_SETUP !== "true") {
    throw new Error("PAY_PAYPAL_E2E_SETUP=true is required")
  }
  if (process.env.PAYPAL_ENVIRONMENT !== "sandbox") {
    throw new Error("PAYPAL_ENVIRONMENT=sandbox is required")
  }

  const password = process.env.PAY_PAYPAL_TEST_PASSWORD
  if (!password) {
    throw new Error("PAY_PAYPAL_TEST_PASSWORD is required")
  }

  const customerModule = container.resolve(Modules.CUSTOMER) as unknown as {
    listCustomers: (filters: Record<string, unknown>) => Promise<CustomerRecord[]>
  }
  const authModule = container.resolve(Modules.AUTH) as unknown as {
    listAuthIdentities: (filters: Record<string, unknown>) => Promise<AuthIdentityRecord[]>
    listProviderIdentities: (filters: Record<string, unknown>) => Promise<ProviderIdentityRecord[]>
    updateProvider: (provider: string, data: Record<string, unknown>) => Promise<AuthResponse>
    authenticate: (provider: string, data: Record<string, unknown>) => Promise<AuthResponse>
  }

  const customers = (await customerModule.listCustomers({ id: TARGET_CUSTOMER_ID }))
    .filter((customer) =>
      customer.id === TARGET_CUSTOMER_ID &&
      customer.email?.toLowerCase() === TARGET_BUYER_EMAIL
    )
  if (customers.length !== 1) {
    throw new Error("Target PayPal fixture customer ID/email did not match exactly")
  }

  const providerIdentities = await authModule.listProviderIdentities({
    provider: "emailpass",
    entity_id: TARGET_BUYER_EMAIL,
  })
  if (providerIdentities.length !== 1 || !providerIdentities[0].auth_identity_id) {
    throw new Error(`Expected exactly one emailpass provider identity; found ${providerIdentities.length}`)
  }

  const identities = await authModule.listAuthIdentities({ id: providerIdentities[0].auth_identity_id })
  if (identities.length !== 1) {
    throw new Error(`Expected exactly one auth identity; found ${identities.length}`)
  }
  if (identities[0].app_metadata?.customer_id !== TARGET_CUSTOMER_ID) {
    throw new Error("Auth identity customer binding mismatch for target PayPal fixture buyer")
  }

  const updated = await authModule.updateProvider("emailpass", {
    entity_id: TARGET_BUYER_EMAIL,
    password,
  })
  if (!updated.success || !updated.authIdentity) {
    throw new Error(`Unable to update target PayPal fixture buyer password: ${updated.error ?? "unknown error"}`)
  }

  const verified = await authModule.authenticate("emailpass", {
    body: { email: TARGET_BUYER_EMAIL, password },
  })
  if (!verified.success || verified.authIdentity?.app_metadata?.customer_id !== TARGET_CUSTOMER_ID) {
    throw new Error("Target PayPal fixture buyer password verification failed")
  }

  console.log(JSON.stringify({
    target_customer_id: TARGET_CUSTOMER_ID,
    target_email: TARGET_BUYER_EMAIL,
    password_reset_succeeded: true,
    no_other_account_modified: true,
  }, null, 2))
}
