import type { ExecArgs } from "./medusa-exec-args"
import { Modules } from "@medusajs/framework/utils"

const maskEmail = (email: string) => {
  const [name, domain] = email.split("@")
  if (!domain) return "***"
  return `${name.slice(0, 2)}${"*".repeat(Math.max(2, name.length - 2))}@${domain}`
}

const email = process.env.INSPECT_BUYER_EMAIL?.trim().toLowerCase()

export default async function inspectBuyerAuthAccount({ container }: ExecArgs) {
  if (!email) {
    throw new Error("INSPECT_BUYER_EMAIL is required.")
  }

  const customerModule = container.resolve(Modules.CUSTOMER) as {
    listCustomers: (filters: Record<string, unknown>) => Promise<Array<{
      id?: string
      email?: string | null
      metadata?: Record<string, unknown> | null
    }>>
  }
  const authModule = container.resolve(Modules.AUTH) as {
    listProviderIdentities: (filters: Record<string, unknown>) => Promise<Array<{
      provider?: string
      entity_id?: string | null
      auth_identity_id?: string | null
    }>>
    listAuthIdentities: (filters: Record<string, unknown>) => Promise<Array<{
      id?: string
      app_metadata?: Record<string, unknown> | null
    }>>
  }

  const customers = (await customerModule.listCustomers({ email }))
    .filter((customer) => customer.email?.toLowerCase() === email)
  const providerIdentities = await authModule.listProviderIdentities({ provider: "emailpass", entity_id: email })
  const authIdentityIds = providerIdentities
    .map((identity) => identity.auth_identity_id)
    .filter((id): id is string => Boolean(id))
  const authIdentities = authIdentityIds.length
    ? await authModule.listAuthIdentities({ id: authIdentityIds })
    : []
  const customerIds = customers.map((customer) => customer.id).filter(Boolean)
  const metadata = customers.length === 1 ? customers[0].metadata ?? {} : {}
  const boundCustomerIds = authIdentities
    .map((identity) => identity.app_metadata?.customer_id)
    .filter((id): id is string => typeof id === "string")

  console.log("BUYER_AUTH_ACCOUNT_SUMMARY", JSON.stringify({
    email: maskEmail(email),
    customerCount: customers.length,
    customerIds,
    emailpassIdentityCount: providerIdentities.length,
    authIdentityCount: authIdentities.length,
    boundCustomerIds,
    bindingMatchesCustomer: customerIds.length === 1 && boundCustomerIds.includes(customerIds[0] as string),
    emailVerified: typeof metadata.email_verified_at === "string" && metadata.email_verified_at.length > 0,
    emailVerifiedAt: typeof metadata.email_verified_at === "string" ? metadata.email_verified_at : null,
    hasPasswordResetHash: typeof metadata.password_reset_code_hash === "string" && metadata.password_reset_code_hash.length > 0,
    passwordResetExpiresAt: typeof metadata.password_reset_expires_at === "string" ? metadata.password_reset_expires_at : null,
    passwordResetUsedAt: typeof metadata.password_reset_used_at === "string" ? metadata.password_reset_used_at : null,
    passwordResetLastSentAt: typeof metadata.password_reset_last_sent_at === "string" ? metadata.password_reset_last_sent_at : null,
    passwordResetWindowStartedAt: typeof metadata.password_reset_window_started_at === "string" ? metadata.password_reset_window_started_at : null,
    passwordResetWindowCount: Number(metadata.password_reset_window_count ?? 0) || 0,
    hasEmailVerificationHash: typeof metadata.email_verification_code_hash === "string" && metadata.email_verification_code_hash.length > 0,
    emailVerificationExpiresAt: typeof metadata.email_verification_expires_at === "string" ? metadata.email_verification_expires_at : null,
  }))
}
