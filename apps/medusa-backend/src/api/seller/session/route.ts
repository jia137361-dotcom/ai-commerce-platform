import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveAdminUserId } from "../../../lib/platform-admin/require-platform-operator"
import { resolveSellerSession } from "../../../lib/seller-register"
import { sendError } from "../../_helpers/store-core"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const userId = resolveAdminUserId(req)
  if (!userId) {
    return sendError(res, 401, "UNAUTHORIZED", "Seller authentication required")
  }

  const session = await resolveSellerSession(req.scope, userId)
  if (!session.store_id) {
    return sendError(res, 404, "STORE_NOT_FOUND", "No seller store is linked to this account")
  }

  return res.json({ session })
}
