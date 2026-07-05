import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getPublicStoreBySlug } from "../../../../lib/marketplace/public-marketplace"
import { sendError } from "../../../_helpers/store-core"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const slug = String(req.params.slug ?? "").trim()
  if (!slug) {
    return sendError(res, 400, "VALIDATION_ERROR", "Store slug is required")
  }

  const store = await getPublicStoreBySlug(req.scope, slug)
  if (!store) {
    return sendError(res, 404, "VALIDATION_ERROR", "Store not found")
  }

  return res.json({ store })
}
