import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { resolveCurrentStore } from "../../../lib/store-context"
import { listStoreFollowers } from "../../../lib/store-engagement"

/** Seller: list buyers who follow the current store. */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { store_id: storeId } = resolveCurrentStore(req)
  const limitRaw = Number(req.query?.limit ?? 100)
  const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 100, 1), 500)
  const offsetRaw = Number(req.query?.offset ?? 0)
  const offset = Math.max(Number.isFinite(offsetRaw) ? offsetRaw : 0, 0)

  const customerModule = req.scope.resolve(Modules.CUSTOMER) as {
    listCustomers: (
      filters: Record<string, unknown>,
      config?: Record<string, unknown>
    ) => Promise<
      Array<{
        id?: string
        email?: string | null
        first_name?: string | null
        last_name?: string | null
        metadata?: Record<string, unknown> | null
      }>
    >
  }

  const customers = await customerModule.listCustomers(
    {},
    {
      select: ["id", "email", "first_name", "last_name", "metadata"],
      take: 10000,
    }
  )

  const followers = listStoreFollowers(customers, storeId)
  const page = followers.slice(offset, offset + limit)

  return res.json({
    store_id: storeId,
    follower_count: followers.length,
    count: followers.length,
    limit,
    offset,
    followers: page,
  })
}
