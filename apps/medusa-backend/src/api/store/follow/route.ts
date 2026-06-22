import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { resolveCurrentStore } from "../../../lib/store-context"
import { countUniqueStoreFollowers, pickStoreSettingsRow } from "../../../lib/store-engagement"
import { getStoreCoreService, sendError } from "../../_helpers/store-core"

type AuthenticatedRequest = MedusaRequest & {
  auth_context?: { actor_id?: string }
}

const readFollowedStores = (metadata: Record<string, unknown> | null | undefined) => {
  const raw = metadata?.followed_store_ids
  if (!Array.isArray(raw)) return [] as string[]
  return raw.filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { store_id: storeId } = resolveCurrentStore(req)
  const storeCore = getStoreCoreService(req)
  const rows = await storeCore.listStoreSettings({ store_id: storeId })
  const row = pickStoreSettingsRow(rows, storeId)
  const customerModule = req.scope.resolve(Modules.CUSTOMER) as any
  const customers = await customerModule.listCustomers({}, { select: ["id", "metadata"], take: 10000 })
  const followerCount = countUniqueStoreFollowers(customers, storeId)

  const customerId = (req as AuthenticatedRequest).auth_context?.actor_id
  let following = false
  if (customerId) {
    const customer = await customerModule.retrieveCustomer(customerId)
    const followed = readFollowedStores(customer.metadata as Record<string, unknown> | null)
    following = followed.includes(storeId)
  }

  return res.json({ store_id: storeId, follower_count: followerCount, following })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { store_id: storeId } = resolveCurrentStore(req)
    const body = (req.body ?? {}) as { following?: boolean }
    const following = body.following !== false

    const storeCore = getStoreCoreService(req)
    const rows = await storeCore.listStoreSettings({ store_id: storeId })
    const row = pickStoreSettingsRow(rows, storeId)
    const metadata = (row?.metadata ?? {}) as Record<string, unknown>
    const customerModule = req.scope.resolve(Modules.CUSTOMER) as any

    const customerId = (req as AuthenticatedRequest).auth_context?.actor_id
    let wasFollowing = false
    if (customerId) {
      const customer = await customerModule.retrieveCustomer(customerId)
      const followed = readFollowedStores(customer.metadata as Record<string, unknown> | null)
      wasFollowing = followed.includes(storeId)
      const nextFollowed = following
        ? Array.from(new Set([...followed, storeId]))
        : followed.filter((id) => id !== storeId)
      await customerModule.updateCustomers(customerId, {
        metadata: {
          ...(customer.metadata as Record<string, unknown> | null),
          followed_store_ids: nextFollowed,
        },
      } as never)
    }

    const customers = await customerModule.listCustomers({}, { select: ["id", "metadata"], take: 10000 })
    const followerCount = countUniqueStoreFollowers(customers, storeId)
    const nextMetadata = { ...metadata, follower_count: followerCount }

    if (customerId && following !== wasFollowing) {
      if (row?.id) {
        await storeCore.updateStoreSettings({
          selector: { id: row.id },
          data: { metadata: nextMetadata },
        })
      } else {
        await storeCore.createStoreSettings({
          store_id: storeId,
          metadata: nextMetadata,
        })
      }
    }

    return res.json({
      store_id: storeId,
      following,
      follower_count: followerCount,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to update follow state"
    return sendError(res, 400, "VALIDATION_ERROR", message)
  }
}
