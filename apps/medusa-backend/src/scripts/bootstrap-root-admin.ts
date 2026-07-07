import type { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { STORE_CORE_MODULE } from "../modules/store-core"
import type StoreCoreModuleService from "../modules/store-core/service"

type UserRecord = {
  id: string
  email?: string | null
  first_name?: string | null
  last_name?: string | null
}

type AuthIdentity = {
  id: string
  app_metadata?: Record<string, unknown> | null
}

const normalizeEmail = (email: string) => email.trim().toLowerCase()

function splitName(name?: string | null) {
  const clean = name?.trim()
  if (!clean) return { first_name: "Root", last_name: "Admin" }
  const [first, ...rest] = clean.split(/\s+/)
  return { first_name: first || "Root", last_name: rest.join(" ") || "Admin" }
}

async function ensureEmailpassIdentity(
  authModule: {
    listProviderIdentities: (filters: Record<string, unknown>) => Promise<Array<{ auth_identity_id?: string | null }>>
    updateAuthIdentities: (data: Record<string, unknown>) => Promise<AuthIdentity>
    updateProvider: (provider: string, data: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>
    register: (provider: string, data: Record<string, unknown>) => Promise<{ success: boolean; error?: string; authIdentity?: AuthIdentity }>
  },
  email: string,
  password: string | undefined,
  userId: string
) {
  let identities = await authModule.listProviderIdentities({ provider: "emailpass", entity_id: email })
  const existingIdentityId = identities[0]?.auth_identity_id

  if (!existingIdentityId) {
    if (!password || password.length < 12) {
      throw new Error("ROOT_ADMIN_PASSWORD is required and must be at least 12 characters for first-time setup.")
    }
    const registered = await authModule.register("emailpass", { body: { email, password } })
    if (!registered.success || !registered.authIdentity?.id) {
      throw new Error(registered.error ?? "Unable to register root admin credentials")
    }
    identities = [{ auth_identity_id: registered.authIdentity.id }]
  } else if (process.env.ROOT_ADMIN_RESET_PASSWORD === "true") {
    if (!password || password.length < 12) {
      throw new Error("ROOT_ADMIN_PASSWORD is required and must be at least 12 characters when resetting.")
    }
    const updated = await authModule.updateProvider("emailpass", { entity_id: email, password })
    if (!updated.success) {
      throw new Error(updated.error ?? "Unable to reset root admin password")
    }
  }

  const authIdentityId = identities[0]?.auth_identity_id
  if (!authIdentityId) throw new Error("Root admin auth identity is missing")

  await authModule.updateAuthIdentities({
    id: authIdentityId,
    app_metadata: { user_id: userId },
  })
}

export default async function bootstrapRootAdmin({ container }: ExecArgs) {
  const email = normalizeEmail(process.env.ROOT_ADMIN_EMAIL ?? "")
  const password = process.env.ROOT_ADMIN_PASSWORD
  const createOperator = process.env.ROOT_ADMIN_CREATE_PLATFORM_OPERATOR !== "false"
  const role = process.env.ROOT_ADMIN_OPERATOR_ROLE === "viewer" ? "viewer" : "admin"

  if (!email) {
    throw new Error("ROOT_ADMIN_EMAIL is required.")
  }

  const userModule = container.resolve(Modules.USER) as unknown as {
    listUsers: (filters: Record<string, unknown>) => Promise<UserRecord[]>
    createUsers: (data: Record<string, unknown>) => Promise<UserRecord>
  }
  const authModule = container.resolve(Modules.AUTH) as unknown as {
    listProviderIdentities: (filters: Record<string, unknown>) => Promise<Array<{ auth_identity_id?: string | null }>>
    updateAuthIdentities: (data: Record<string, unknown>) => Promise<AuthIdentity>
    updateProvider: (provider: string, data: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>
    register: (provider: string, data: Record<string, unknown>) => Promise<{ success: boolean; error?: string; authIdentity?: AuthIdentity }>
  }
  const storeCore = container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService

  const existingUsers = (await userModule.listUsers({ email })).filter((user) => user.email?.toLowerCase() === email)
  let user = existingUsers[0]
  if (!user) {
    const name = splitName(process.env.ROOT_ADMIN_NAME)
    user = await userModule.createUsers({ email, ...name })
    console.log(`Created root Medusa user ${email} (${user.id})`)
  } else {
    console.log(`Root Medusa user already exists for ${email} (${user.id})`)
  }

  const memberships = await storeCore.listStoreMembers({ user_id: user.id })
  if (memberships.length) {
    throw new Error(`Refusing to bootstrap ${email}: this user is linked to a seller store_member row.`)
  }

  await ensureEmailpassIdentity(authModule, email, password, user.id)
  console.log(`Root admin auth identity is linked for ${email}`)

  if (!createOperator) {
    console.log("ROOT_ADMIN_CREATE_PLATFORM_OPERATOR=false, platform_operator row was not changed.")
    return
  }

  const existingOperators = await storeCore.listPlatformOperators({ user_id: user.id })
  if (existingOperators.length) {
    const operator = existingOperators[0]
    if (operator.status !== "active" || operator.role !== role) {
      await storeCore.updatePlatformOperators(operator.id, { status: "active", role })
      console.log(`Updated platform operator ${operator.id} for ${email}`)
    } else {
      console.log(`Platform operator already active for ${email} (${operator.id})`)
    }
    return
  }

  const operator = await storeCore.createPlatformOperators({
    user_id: user.id,
    role,
    status: "active",
  })
  console.log(`Created platform operator ${operator.id} for ${email}`)
}
