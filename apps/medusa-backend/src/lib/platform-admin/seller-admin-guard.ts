import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { assertSellerUserActive, resolveAdminUserId } from "../platform-admin/require-platform-operator"
import { resolveCurrentStore } from "../store-context"
import { assertStoreActiveForRequest } from "../store-context/assert-store-active"

export async function sellerAdminGuardMiddleware(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const path = req.originalUrl ?? req.url ?? ""
  if (path.includes("/admin/platform")) {
    return next()
  }

  const userId = resolveAdminUserId(req)
  if (userId) {
    const activeUserId = await assertSellerUserActive(req, res)
    if (!activeUserId) return
  }

  const { store_id: storeId } = resolveCurrentStore(req)
  const ok = await assertStoreActiveForRequest(req, res, storeId)
  if (!ok) return

  return next()
}
