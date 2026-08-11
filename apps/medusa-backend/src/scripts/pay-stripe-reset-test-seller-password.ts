import type { ExecArgs } from "./medusa-exec-args"
import { Modules } from "@medusajs/framework/utils"

const TARGET_SELLER_EMAIL = "mkt01_stripe_seller_20260621_01@example.com"

type UserRecord = {
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

export default async function resetPayStripeTestSellerPassword({ container }: ExecArgs) {
  const password = process.env.PAY_STRIPE_TEST_PASSWORD
  if (!password) {
    throw new Error("PAY_STRIPE_TEST_PASSWORD is required")
  }

  const userModule = container.resolve(Modules.USER) as unknown as {
    listUsers: (filters: Record<string, unknown>) => Promise<UserRecord[]>
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

  console.log(`PAY_STRIPE_TEST_SELLER_RESET_STAGE=resolve:${TARGET_SELLER_EMAIL}`)
  const users = (await userModule.listUsers({ email: TARGET_SELLER_EMAIL })).filter(
    (user) => user.email?.toLowerCase() === TARGET_SELLER_EMAIL
  )
  if (users.length !== 1) {
    throw new Error(`Expected exactly one isolated test seller; found ${users.length}`)
  }

  const providerIdentities = await authModule.listProviderIdentities({
    provider: "emailpass",
    entity_id: TARGET_SELLER_EMAIL,
  })
  if (providerIdentities.length !== 1 || !providerIdentities[0].auth_identity_id) {
    throw new Error(`Expected exactly one emailpass provider identity for the isolated test seller; found ${providerIdentities.length}`)
  }
  const identities = await authModule.listAuthIdentities({ id: providerIdentities[0].auth_identity_id })
  if (identities.length !== 1) {
    throw new Error(`Expected exactly one auth identity for the isolated test seller; found ${identities.length}`)
  }

  const userId = users[0].id
  if (identities[0].app_metadata?.user_id !== userId) {
    throw new Error("Isolated test seller auth identity user binding mismatch")
  }

  console.log(`PAY_STRIPE_TEST_SELLER_RESET_STAGE=update:${TARGET_SELLER_EMAIL}`)
  const updated = await authModule.updateProvider("emailpass", {
    entity_id: TARGET_SELLER_EMAIL,
    password,
  })
  if (!updated.success || !updated.authIdentity) {
    throw new Error(`Unable to update isolated test seller password: ${updated.error ?? "unknown error"}`)
  }

  console.log(`PAY_STRIPE_TEST_SELLER_RESET_STAGE=verify:${TARGET_SELLER_EMAIL}`)
  const verified = await authModule.authenticate("emailpass", {
    body: { email: TARGET_SELLER_EMAIL, password },
  })
  if (!verified.success || verified.authIdentity?.app_metadata?.user_id !== userId) {
    throw new Error("Isolated test seller password verification failed")
  }

  console.log(`PAY_STRIPE_TEST_SELLER_UPDATED=${TARGET_SELLER_EMAIL}`)
  console.log("PAY_STRIPE_TEST_SELLER_UPDATE_COUNT=1")
  console.log("PAY_STRIPE_TEST_PASSWORD_VERIFIED=true")
}
