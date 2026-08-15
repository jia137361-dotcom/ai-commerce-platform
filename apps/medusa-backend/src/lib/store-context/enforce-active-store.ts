import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "./index"
import { assertStoreActiveForRequest } from "./assert-store-active"

export async function enforceActiveStoreMiddleware(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  // Customers are platform identities, not store-scoped resources. In
  // particular, Marketplace is a virtual browsing context rather than an
  // `mc_store` row, so account registration must not require that context to
  // resolve as a physical store.
  if (req.path === "/store/customers" || req.path.startsWith("/store/customers/me") || req.path.startsWith("/store/auth/")) {
    return next()
  }

  const { store_id: storeId } = resolveCurrentStore(req)
  const ok = await assertStoreActiveForRequest(req, res, storeId)
  if (!ok) return
  return next()
}
