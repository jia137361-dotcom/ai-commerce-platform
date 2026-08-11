import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { generateJwtTokenForAuthIdentity } from "@medusajs/medusa/api/auth/utils/generate-jwt-token"
import { STORE_CORE_MODULE } from "../modules/store-core"
import type StoreCoreModuleService from "../modules/store-core/service"

export type SellerRegisterInput = {
  email: string
  password: string
  store_name?: string | null
  first_name?: string | null
  last_name?: string | null
}

export type SellerRegisterResult = {
  token: string
  store_id: string
  store_name: string
  email: string
  user_id: string
}

type AuthIdentity = {
  id: string
  app_metadata?: Record<string, unknown> | null
  provider_identities?: Array<{ provider?: string; entity_id?: string | null }>
}

const normalizeEmail = (email: string) => email.trim().toLowerCase()

export const slugifyStoreName = (name: string) => {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
  return slug || "store"
}

const resolveStoreName = (input: SellerRegisterInput) => {
  const explicit = input.store_name?.trim()
  if (explicit) return explicit
  const local = normalizeEmail(input.email).split("@")[0]?.trim()
  return local ? `${local}'s Store` : "My Store"
}

async function ensureUniqueSlug(storeCore: StoreCoreModuleService, base: string) {
  const stores = await storeCore.listStores({}, { take: 10000 })
  const taken = new Set(stores.map((store) => store.slug))
  const root = slugifyStoreName(base)
  if (!taken.has(root)) return root
  for (let index = 1; index < 1000; index += 1) {
    const candidate = `${root}-${index}`
    if (!taken.has(candidate)) return candidate
  }
  return `${root}-${Date.now()}`
}

async function linkAuthIdentityToUser(
  authModule: {
    listProviderIdentities: (filters: Record<string, unknown>) => Promise<Array<{ auth_identity_id?: string | null }>>
    updateAuthIdentities: (data: Record<string, unknown>) => Promise<AuthIdentity>
    updateProvider: (provider: string, data: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>
    authenticate: (provider: string, data: Record<string, unknown>) => Promise<{ success: boolean; error?: string; authIdentity?: AuthIdentity }>
    register: (provider: string, data: Record<string, unknown>) => Promise<{ success: boolean; error?: string; authIdentity?: AuthIdentity }>
  },
  email: string,
  password: string,
  userId: string
) {
  let identities = await authModule.listProviderIdentities({ provider: "emailpass", entity_id: email })
  if (!identities.length) {
    const registered = await authModule.register("emailpass", { body: { email, password } })
    if (!registered.success || !registered.authIdentity?.id) {
      throw new Error(registered.error ?? "Unable to register seller credentials")
    }
    identities = [{ auth_identity_id: registered.authIdentity.id }]
  } else {
    const updatedPassword = await authModule.updateProvider("emailpass", { entity_id: email, password })
    if (!updatedPassword.success) {
      throw new Error(updatedPassword.error ?? "Unable to set seller password")
    }
  }

  const authIdentityId = identities[0]?.auth_identity_id
  if (!authIdentityId) {
    throw new Error("Seller auth identity is missing")
  }

  await authModule.updateAuthIdentities({
    id: authIdentityId,
    app_metadata: { user_id: userId },
  })

  const authed = await authModule.authenticate("emailpass", { body: { email, password } })
  if (!authed.success || !authed.authIdentity?.id) {
    throw new Error(authed.error ?? "Unable to authenticate newly registered seller")
  }

  return authed.authIdentity
}

export async function registerSellerAccount(
  container: MedusaContainer,
  input: SellerRegisterInput
): Promise<SellerRegisterResult> {
  const email = normalizeEmail(input.email)
  const password = input.password
  if (!email) throw new Error("Email is required")
  if (!password || password.length < 8) throw new Error("Password must be at least 8 characters")

  const userModule = container.resolve(Modules.USER) as unknown as {
    listUsers: (filters: Record<string, unknown>) => Promise<Array<{ id: string; email?: string | null }>>
    createUsers: (data: Record<string, unknown>) => Promise<{ id: string; email?: string | null }>
  }
  const authModule = container.resolve(Modules.AUTH) as unknown as {
    listProviderIdentities: (filters: Record<string, unknown>) => Promise<Array<{ auth_identity_id?: string | null }>>
    updateAuthIdentities: (data: Record<string, unknown>) => Promise<AuthIdentity>
    updateProvider: (provider: string, data: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>
    authenticate: (provider: string, data: Record<string, unknown>) => Promise<{ success: boolean; error?: string; authIdentity?: AuthIdentity }>
    register: (provider: string, data: Record<string, unknown>) => Promise<{ success: boolean; error?: string; authIdentity?: AuthIdentity }>
  }
  const storeCore = container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService
  const config = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE) as {
    projectConfig: { http: { jwtSecret: string; jwtExpiresIn?: string; jwtOptions?: Record<string, unknown> } }
  }

  const existingUsers = (await userModule.listUsers({ email })).filter(
    (user) => user.email?.toLowerCase() === email
  )
  if (existingUsers.length) {
    const memberships = await storeCore.listStoreMembers({ user_id: existingUsers[0].id })
    if (memberships.length) {
      throw new Error("A seller account with this email already exists. Sign in instead.")
    }
    throw new Error("This email is already in use. Contact support if you need seller access.")
  }

  const storeName = resolveStoreName(input)
  const slug = await ensureUniqueSlug(storeCore, storeName)
  const user = await userModule.createUsers({
    email,
    first_name: input.first_name?.trim() || null,
    last_name: input.last_name?.trim() || null,
  })

  const authIdentity = await linkAuthIdentityToUser(authModule, email, password, user.id)
  const store = await storeCore.createStores({
    owner_user_id: user.id,
    name: storeName,
    slug,
    description: null,
    status: "active",
  })

  await storeCore.createStoreMembers({
    store_id: store.id,
    user_id: user.id,
    role: "owner",
  })

  await storeCore.createStoreSettings({
    store_id: store.id,
    brand_name: storeName,
    support_email: email,
    metadata: {},
  })

  const token = await generateJwtTokenForAuthIdentity(
    {
      authIdentity: authIdentity as never,
      actorType: "user",
      authProvider: "emailpass",
      container,
    },
    {
      secret: config.projectConfig.http.jwtSecret,
      expiresIn: config.projectConfig.http.jwtExpiresIn,
      options: config.projectConfig.http.jwtOptions,
    }
  )

  return {
    token,
    store_id: store.id,
    store_name: storeName,
    email,
    user_id: user.id,
  }
}

export async function resolveSellerSession(container: MedusaContainer, userId: string) {
  const userModule = container.resolve(Modules.USER) as {
    retrieveUser: (id: string) => Promise<{ id: string; email?: string | null; first_name?: string | null; last_name?: string | null }>
  }
  const storeCore = container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService

  const user = await userModule.retrieveUser(userId)
  const members = await storeCore.listStoreMembers({ user_id: userId })
  const ownerMembership = members.find((member) => member.role === "owner") ?? members[0]
  if (!ownerMembership) {
    return {
      user_id: user.id,
      email: user.email ?? null,
      first_name: user.first_name ?? null,
      last_name: user.last_name ?? null,
      store_id: null as string | null,
      store_name: null as string | null,
    }
  }

  const stores = await storeCore.listStores({ id: ownerMembership.store_id })
  const store = stores[0]

  return {
    user_id: user.id,
    email: user.email ?? null,
    first_name: user.first_name ?? null,
    last_name: user.last_name ?? null,
    store_id: ownerMembership.store_id,
    store_name: store?.name ?? null,
  }
}
