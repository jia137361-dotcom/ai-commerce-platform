import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { preparePlatformCheckout } from "../../../../../lib/marketplace/platform-checkout"
import { sendError } from "../../../../_helpers/store-core"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = (req.body || {}) as {
    groups?: Array<{ store_id?: string; cart_id?: string }>
  }

  const groups = (body.groups ?? [])
    .map((group) => ({
      store_id: group.store_id?.trim() ?? "",
      cart_id: group.cart_id?.trim() ?? "",
    }))
    .filter((group) => group.store_id && group.cart_id)

  if (!groups.length) {
    return sendError(res, 400, "VALIDATION_ERROR", "groups must include store_id and cart_id")
  }

  try {
    const prepared = await preparePlatformCheckout(req.scope, groups)
    return res.status(200).json(prepared)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to prepare platform checkout"
    return sendError(res, 400, "VALIDATION_ERROR", message)
  }
}
