/**
 * Complete a buyer Studio design session → My Design draft + cartable variants.
 *
 * POST /store/design-sessions/complete
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../../lib/store-context"
import { sendError } from "../../../_helpers/store-core"
import { completeBuyerDesignSession } from "../../../../lib/s2bdiy/complete-buyer-design"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { store_id: storeId } = resolveCurrentStore(req)

  const body = (req.body ?? {}) as {
    s2b_product_id?: number | string
    basic_product_id?: number | string
    size_id?: number | string
    color_id?: number | string
    price?: number
    save_as?: "draft" | "ready"
    blank_product_id?: string
    guest_key?: string
    mockup_url?: string
  }

  if (!body.s2b_product_id || !body.basic_product_id) {
    return sendError(res, 400, "MISSING_FIELDS", "s2b_product_id and basic_product_id are required")
  }

  const auth = req as MedusaRequest & { auth_context?: { actor_id?: string } }
  const customerId =
    typeof auth.auth_context?.actor_id === "string" ? auth.auth_context.actor_id : null
  const guestKey =
    typeof body.guest_key === "string" && body.guest_key.trim() ? body.guest_key.trim() : null
  const blankProductId =
    typeof body.blank_product_id === "string" && body.blank_product_id.trim()
      ? body.blank_product_id.trim()
      : null

  try {
    const result = await completeBuyerDesignSession(req.scope, {
      storeId,
      s2bProductId: body.s2b_product_id,
      basicProductId: body.basic_product_id,
      sizeId: body.size_id,
      colorId: body.color_id,
      price: body.price,
      mockupUrl: body.mockup_url,
      saveAs: body.save_as === "ready" ? "ready" : "draft",
      blankProductId,
      guestKey,
      customerId,
    })
    return res.status(201).json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("[design-sessions/complete] failed:", message)
    if (message.includes("not configured")) {
      return sendError(res, 503, "EXTERNAL_SERVICE_ERROR", "Design service is not configured")
    }
    if (message.includes("Unable to resolve size/color")) {
      return sendError(res, 400, "VALIDATION_ERROR", message)
    }
    return sendError(res, 500, "EXTERNAL_SERVICE_ERROR", `Unable to complete design session: ${message}`)
  }
}
