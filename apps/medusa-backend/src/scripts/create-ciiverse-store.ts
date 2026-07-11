import type { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { STORE_CORE_MODULE } from "../modules/store-core"
import type StoreCoreModuleService from "../modules/store-core/service"

const CIIVERSE_EMAIL = "ciiverse@gmail.com"
const CIIVERSE_PASSWORD = "Ciiverse123456"
const STORE_NAME = "CiiVerse"

export default async function createCiiverseStore({ container }: ExecArgs) {
  const userModule = container.resolve(Modules.USER) as {
    listUsers: (filters: Record<string, unknown>) => Promise<Array<{ id: string; email?: string | null }>>
  }
  const authModule = container.resolve(Modules.AUTH) as {
    listProviderIdentities: (filters: Record<string, unknown>) => Promise<Array<{ entity_id?: string | null }>>
    updateProvider: (provider: string, data: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>
    authenticate: (provider: string, data: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>
  }
  const storeCore = container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService

  // Find ciiverse user
  const users = (await userModule.listUsers({ email: CIIVERSE_EMAIL })).filter(
    (row) => row.email?.toLowerCase() === CIIVERSE_EMAIL
  )
  if (!users.length) {
    throw new Error(`No user found with email ${CIIVERSE_EMAIL}. Create user first.`)
  }
  const userId = users[0].id
  console.log(`Found ciiverse user: ${userId}`)

  // Set password
  const identities = await authModule.listProviderIdentities({
    provider: "emailpass",
    entity_id: CIIVERSE_EMAIL,
  })
  if (identities.length) {
    const updated = await authModule.updateProvider("emailpass", {
      entity_id: CIIVERSE_EMAIL,
      password: CIIVERSE_PASSWORD,
    })
    if (!updated.success) {
      throw new Error(`Unable to set password: ${updated.error}`)
    }
    console.log("Password set successfully")
  }

  // Check if user already has a store membership
  const existingMembers = await storeCore.listStoreMembers({ user_id: userId })
  if (existingMembers.length) {
    console.log(`User already has store membership: ${existingMembers[0].store_id}`)
    const stores = await storeCore.listStores({ id: existingMembers[0].store_id })
    if (stores.length) {
      console.log(`Store name: ${stores[0].name}`)
    }
    return
  }

  // Create store
  const slug = "ciiverse"
  const store = await storeCore.createStores({
    owner_user_id: userId,
    name: STORE_NAME,
    slug,
    description: "CiiVerse - AI Commerce Store",
    status: "active",
  })
  console.log(`Created store: ${store.id}`)

  // Create store member
  await storeCore.createStoreMembers({
    store_id: store.id,
    user_id: userId,
    role: "owner",
  })
  console.log("Created store member")

  // Create store settings
  await storeCore.createStoreSettings({
    store_id: store.id,
    brand_name: STORE_NAME,
    support_email: CIIVERSE_EMAIL,
    metadata: {},
  })
  console.log("Created store settings")

  // Verify login
  const verified = await authModule.authenticate("emailpass", {
    body: { email: CIIVERSE_EMAIL, password: CIIVERSE_PASSWORD },
  })
  if (!verified.success) {
    throw new Error(`Login verification failed: ${verified.error}`)
  }
  console.log("Login verification passed")

  console.log("CIIVERSE_STORE_SETUP_COMPLETE=true")
  console.log(`CIIVERSE_STORE_ID=${store.id}`)
  console.log(`CIIVERSE_EMAIL=${CIIVERSE_EMAIL}`)
  console.log(`CIIVERSE_PASSWORD=${CIIVERSE_PASSWORD}`)
}
