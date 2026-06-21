import type { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

const TARGET_BUYER_EMAILS = [
  "mkt01_stripe_buyer_a_20260621_01@example.com",
  "mkt01_stripe_buyer_b_20260621_01@example.com",
] as const

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

export default async function resetPayStripeTestBuyerPasswords({ container }: ExecArgs) {
  const password = process.env.PAY_STRIPE_TEST_PASSWORD
  if (!password) {
    throw new Error("PAY_STRIPE_TEST_PASSWORD is required")
  }

  const customerModule = container.resolve(Modules.CUSTOMER) as unknown as {
    listCustomers: (filters: Record<string, unknown>) => Promise<CustomerRecord[]>
  }
  const authModule = container.resolve(Modules.AUTH) as unknown as {
    listAuthIdentities: (
      filters: Record<string, unknown>,
      config?: Record<string, unknown>
    ) => Promise<AuthIdentityRecord[]>
    listProviderIdentities: (filters: Record<string, unknown>) => Promise<ProviderIdentityRecord[]>
    updateProvider: (provider: string, data: Record<string, unknown>) => Promise<AuthResponse>
    authenticate: (provider: string, data: Record<string, unknown>) => Promise<AuthResponse>
  }

  const updatedEmails: string[] = []

  for (const email of TARGET_BUYER_EMAILS) {
    console.log(`PAY_STRIPE_TEST_BUYER_RESET_STAGE=resolve:${email}`)
    const customers = (await customerModule.listCustomers({ email })).filter(
      (customer) => customer.email?.toLowerCase() === email
    )
    if (customers.length !== 1) {
      throw new Error(`Expected exactly one isolated test customer for ${email}; found ${customers.length}`)
    }

    const providerIdentities = await authModule.listProviderIdentities({
      provider: "emailpass",
      entity_id: email,
    })
    if (providerIdentities.length !== 1 || !providerIdentities[0].auth_identity_id) {
      throw new Error(`Expected exactly one emailpass provider identity for ${email}; found ${providerIdentities.length}`)
    }
    const identities = await authModule.listAuthIdentities({ id: providerIdentities[0].auth_identity_id })
    if (identities.length !== 1) {
      throw new Error(`Expected exactly one auth identity for ${email}; found ${identities.length}`)
    }

    const customerId = customers[0].id
    const identityCustomerId = identities[0].app_metadata?.customer_id
    if (identityCustomerId !== customerId) {
      throw new Error(`Auth identity customer binding mismatch for ${email}`)
    }

    console.log(`PAY_STRIPE_TEST_BUYER_RESET_STAGE=update:${email}`)
    const updated = await authModule.updateProvider("emailpass", {
      entity_id: email,
      password,
    })
    if (!updated.success || !updated.authIdentity) {
      throw new Error(`Unable to update password for ${email}: ${updated.error ?? "unknown error"}`)
    }

    console.log(`PAY_STRIPE_TEST_BUYER_RESET_STAGE=verify:${email}`)
    const verified = await authModule.authenticate("emailpass", {
      body: { email, password },
    })
    if (!verified.success || verified.authIdentity?.app_metadata?.customer_id !== customerId) {
      throw new Error(`Password verification failed for ${email}`)
    }

    updatedEmails.push(email)
  }

  console.log(`PAY_STRIPE_TEST_BUYERS_UPDATED=${updatedEmails.join(",")}`)
  console.log(`PAY_STRIPE_TEST_BUYER_UPDATE_COUNT=${updatedEmails.length}`)
  console.log("PAY_STRIPE_TEST_PASSWORD_VERIFIED=true")
}
