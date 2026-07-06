import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { assertSellerUserActive, resolveAdminUserId } from "../platform-admin/require-platform-operator"
import { assertSellerStoreMemberForRequest } from "../store-context/assert-seller-store-member"

const SELLER_ADMIN_PREFIXES = [
  "/admin/ai",
  "/admin/fulfillment-orders",
  "/admin/logistics",
  "/admin/market-regions",
  "/admin/messages",
  "/admin/notifications",
  "/admin/orders",
  "/admin/platform-products",
  "/admin/product-categories",
  "/admin/products",
  "/admin/store-products",
  "/admin/store-settings",
  "/admin/stripe-connect",
  "/admin/supplier-orders",
  "/admin/supplier-products",
]

const isSellerAdminPath = (path: string) =>
  SELLER_ADMIN_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`))

export async function sellerAdminGuardMiddleware(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const path = req.originalUrl ?? req.url ?? ""
  if (path.includes("/admin/platform")) {
    return next()
  }
  if (!isSellerAdminPath(path)) {
    return next()
  }

  const userId = resolveAdminUserId(req)
  if (userId) {
    const activeUserId = await assertSellerUserActive(req, res)
    if (!activeUserId) return
  }

  const member = await assertSellerStoreMemberForRequest(req, res)
  if (!member) return

  return next()
}
