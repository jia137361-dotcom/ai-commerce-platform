import type { ExecArgs } from "./medusa-exec-args"
import { Modules } from "@medusajs/framework/utils"
import { STORE_CORE_MODULE } from "../modules/store-core"
import type StoreCoreModuleService from "../modules/store-core/service"
import { DEFAULT_STORE_ID } from "../lib/store-context"

const DEFAULT_PASSWORD = process.env.DEV_ACCOUNTS_PASSWORD ?? "Meng1355026750"

const PLATFORM_OPS_EMAIL =
  process.env.PLATFORM_OPS_OPERATOR_EMAIL?.trim().toLowerCase() || "1355026750@qq.com"
const SELLER_EMAIL = process.env.DEV_SELLER_EMAIL?.trim().toLowerCase() || "lujiamengvivi79@gmail.com"
const BUYER_EMAIL = process.env.DEV_BUYER_EMAIL?.trim().toLowerCase() || "1355026750@qq.com"

type AuthResponse = {
  success: boolean
  error?: string
}

type UserRecord = { id: string; email?: string | null }
type CustomerRecord = { id: string; email?: string | null }

async function ensureUserPassword(
  authModule: {
    listProviderIdentities: (filters: Record<string, unknown>) => Promise<Array<{ entity_id?: string | null }>>
    updateProvider: (provider: string, data: Record<string, unknown>) => Promise<AuthResponse>
    authenticate: (provider: string, data: Record<string, unknown>) => Promise<AuthResponse>
  },
  email: string,
  password: string
) {
  const identities = await authModule.listProviderIdentities({
    provider: "emailpass",
    entity_id: email,
  })
  if (!identities.length) {
    throw new Error(`No emailpass identity for user ${email}. Create the Medusa user first (medusa user -e ${email}).`)
  }
  const updated = await authModule.updateProvider("emailpass", { entity_id: email, password })
  if (!updated.success) {
    throw new Error(`Unable to set password for ${email}: ${updated.error ?? "unknown error"}`)
  }
  const verified = await authModule.authenticate("emailpass", { body: { email, password } })
  if (!verified.success) {
    throw new Error(`Password verification failed for user ${email}`)
  }
  console.log(`DEV_ACCOUNT_USER_PASSWORD_OK=${email}`)
}

async function ensureCustomerAccount(
  container: ExecArgs["container"],
  authModule: {
    register: (provider: string, data: Record<string, unknown>) => Promise<AuthResponse & { authIdentity?: { id?: string } }>
    listProviderIdentities: (filters: Record<string, unknown>) => Promise<Array<{ entity_id?: string | null }>>
    updateProvider: (provider: string, data: Record<string, unknown>) => Promise<AuthResponse>
    authenticate: (provider: string, data: Record<string, unknown>) => Promise<AuthResponse>
  },
  customerModule: { listCustomers: (filters: Record<string, unknown>) => Promise<CustomerRecord[]>; createCustomers: (data: Record<string, unknown>) => Promise<CustomerRecord> },
  email: string,
  password: string
) {
  const existing = (await customerModule.listCustomers({ email })).filter(
    (row) => row.email?.toLowerCase() === email
  )
  const identities = await authModule.listProviderIdentities({ provider: "emailpass", entity_id: email })

  if (!identities.length) {
    const registered = await authModule.register("emailpass", {
      body: { email, password },
      actorType: "customer",
    })
    if (!registered.success) {
      throw new Error(`Unable to register buyer ${email}: ${registered.error ?? "unknown error"}`)
    }
    if (!existing.length) {
      await customerModule.createCustomers({
        email,
        first_name: "Test",
        last_name: "Buyer",
      })
    }
    console.log(`DEV_ACCOUNT_BUYER_REGISTERED=${email}`)
  } else {
    const updated = await authModule.updateProvider("emailpass", { entity_id: email, password })
    if (!updated.success) {
      throw new Error(`Unable to set buyer password for ${email}: ${updated.error ?? "unknown error"}`)
    }
    if (!existing.length) {
      await customerModule.createCustomers({
        email,
        first_name: "Test",
        last_name: "Buyer",
      })
      console.log(`DEV_ACCOUNT_BUYER_CUSTOMER_CREATED=${email}`)
    }
  }

  const verified = await authModule.authenticate("emailpass", { body: { email, password } })
  if (!verified.success) {
    throw new Error(`Buyer password verification failed for ${email}`)
  }
  console.log(`DEV_ACCOUNT_BUYER_PASSWORD_OK=${email}`)
}

async function ensurePlatformOperator(
  storeCore: StoreCoreModuleService,
  userId: string,
  email: string
) {
  const existing = await storeCore.listPlatformOperators({ user_id: userId })
  if (existing.length) {
    console.log(`DEV_ACCOUNT_PLATFORM_OPERATOR_EXISTS=${email} (${existing[0].id})`)
    return existing[0]
  }
  const operator = await storeCore.createPlatformOperators({
    user_id: userId,
    role: "admin",
    status: "active",
  })
  console.log(`DEV_ACCOUNT_PLATFORM_OPERATOR_CREATED=${email} (${operator.id})`)
  return operator
}

async function ensureSellerStoreMembership(
  storeCore: StoreCoreModuleService,
  userId: string,
  storeId: string
) {
  const members = await storeCore.listStoreMembers({ store_id: storeId, user_id: userId })
  if (members.length) {
    console.log(`DEV_ACCOUNT_SELLER_MEMBER_EXISTS=${storeId}`)
    return
  }
  await storeCore.createStoreMembers({ store_id: storeId, user_id: userId, role: "owner" })
  console.log(`DEV_ACCOUNT_SELLER_MEMBER_CREATED=${storeId}`)
}

export default async function devAccountsBootstrap({ container }: ExecArgs) {
  const password = DEFAULT_PASSWORD
  const userModule = container.resolve(Modules.USER) as {
    listUsers: (filters: Record<string, unknown>) => Promise<UserRecord[]>
  }
  const customerModule = container.resolve(Modules.CUSTOMER) as {
    listCustomers: (filters: Record<string, unknown>) => Promise<CustomerRecord[]>
    createCustomers: (data: Record<string, unknown>) => Promise<CustomerRecord>
  }
  const authModule = container.resolve(Modules.AUTH) as {
    register: (provider: string, data: Record<string, unknown>) => Promise<AuthResponse & { authIdentity?: { id?: string } }>
    listProviderIdentities: (filters: Record<string, unknown>) => Promise<Array<{ entity_id?: string | null }>>
    updateProvider: (provider: string, data: Record<string, unknown>) => Promise<AuthResponse>
    authenticate: (provider: string, data: Record<string, unknown>) => Promise<AuthResponse>
  }
  const storeCore = container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService

  const opsUsers = (await userModule.listUsers({ email: PLATFORM_OPS_EMAIL })).filter(
    (row) => row.email?.toLowerCase() === PLATFORM_OPS_EMAIL
  )
  if (opsUsers.length !== 1) {
    throw new Error(
      `Expected exactly one Medusa user for platform ops (${PLATFORM_OPS_EMAIL}); found ${opsUsers.length}. Run: npx medusa user -e ${PLATFORM_OPS_EMAIL}`
    )
  }

  const sellerUsers = (await userModule.listUsers({ email: SELLER_EMAIL })).filter(
    (row) => row.email?.toLowerCase() === SELLER_EMAIL
  )
  if (sellerUsers.length !== 1) {
    throw new Error(
      `Expected exactly one seller user (${SELLER_EMAIL}); found ${sellerUsers.length}. Run: npx medusa user -e ${SELLER_EMAIL}`
    )
  }

  await ensureUserPassword(authModule, PLATFORM_OPS_EMAIL, password)
  await ensureUserPassword(authModule, SELLER_EMAIL, password)
  await ensureCustomerAccount(container, authModule, customerModule, BUYER_EMAIL, password)
  await ensurePlatformOperator(storeCore, opsUsers[0].id, PLATFORM_OPS_EMAIL)
  await ensureSellerStoreMembership(storeCore, sellerUsers[0].id, DEFAULT_STORE_ID)

  console.log("DEV_ACCOUNTS_BOOTSTRAP_OK=true")
  console.log(`DEV_PLATFORM_OPS_EMAIL=${PLATFORM_OPS_EMAIL}`)
  console.log(`DEV_SELLER_EMAIL=${SELLER_EMAIL}`)
  console.log(`DEV_BUYER_EMAIL=${BUYER_EMAIL}`)
}
