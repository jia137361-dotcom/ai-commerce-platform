import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "./index"
import { assertStoreActiveForRequest } from "./assert-store-active"

export async function enforceActiveStoreMiddleware(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const { store_id: storeId } = resolveCurrentStore(req)
  const ok = await assertStoreActiveForRequest(req, res, storeId)
  if (!ok) return
  return next()
}
