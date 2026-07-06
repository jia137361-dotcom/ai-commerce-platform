import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { sendError } from "../../api/_helpers/store-core"
import { STORE_CORE_MODULE } from "../../modules/store-core"
import type StoreCoreModuleService from "../../modules/store-core/service"
import { resolveAdminUserId } from "../platform-admin/require-platform-operator"
import { assertStoreActiveForRequest } from "./assert-store-active"
import { resolveCurrentStore } from "./index"

export async function assertSellerStoreMemberForRequest(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<{ user_id: string; store_id: string; role: string } | null> {
  const userId = resolveAdminUserId(req)
  if (!userId) {
    sendError(res, 401, "UNAUTHORIZED", "Seller authentication required")
    return null
  }

  const { store_id: storeId } = resolveCurrentStore(req)
  const active = await assertStoreActiveForRequest(req, res, storeId)
  if (!active) return null

  const storeCore = req.scope.resolve(STORE_CORE_MODULE) as StoreCoreModuleService
  const members = await storeCore.listStoreMembers({ user_id: userId, store_id: storeId })
  const member = members[0] as { user_id: string; store_id: string; role: string } | undefined

  if (!member) {
    sendError(res, 403, "FORBIDDEN", "Seller account is not linked to this store")
    return null
  }

  return {
    user_id: member.user_id,
    store_id: member.store_id,
    role: member.role,
  }
}
