import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  buyerLoginEmailDeniedMessage,
  isAllowedBuyerLoginEmail,
  normalizeBuyerEmail,
} from "../buyer-auth-policy"

/** Block emailpass login/register for non-allowlisted buyer emails (test emails exempt). */
export async function enforceBuyerEmailAllowlistMiddleware(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const body = (req.body ?? {}) as { email?: unknown }
  const email = normalizeBuyerEmail(body.email)
  if (!email) {
    return next()
  }
  if (!isAllowedBuyerLoginEmail(email)) {
    return res.status(403).json({
      type: "unauthorized",
      message: buyerLoginEmailDeniedMessage,
      error: {
        code: "EMAIL_PROVIDER_NOT_ALLOWED",
        message: buyerLoginEmailDeniedMessage,
      },
    })
  }
  return next()
}
