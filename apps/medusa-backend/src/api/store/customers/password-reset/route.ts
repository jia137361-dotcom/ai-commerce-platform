import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  confirmBuyerPasswordReset,
  requestBuyerPasswordReset,
} from "../../../../lib/buyer-password-reset"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = (req.body ?? {}) as { email?: unknown }
  try {
    const result = await requestBuyerPasswordReset(req.scope, body.email)
    return res.json({
      sent: true,
      message: result.message,
      ...(result.devCode ? { dev_code: result.devCode, expires_at: result.expiresAt } : {}),
    })
  } catch {
    return res.status(503).json({
      error: {
        code: "EMAIL_DELIVERY_ERROR",
        message: "We couldn't send the email right now. Please try again.",
      },
    })
  }
}

export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = (req.body ?? {}) as { email?: unknown; code?: unknown; password?: unknown }
  try {
    const result = await confirmBuyerPasswordReset(req.scope, {
      email: body.email,
      code: body.code,
      password: body.password,
    })
    return res.json({ reset: true, email: result.email })
  } catch {
    return res.status(400).json({
      error: {
        code: "PASSWORD_RESET_ERROR",
        message: "Reset code is invalid or expired. Request a new code and try again.",
      },
    })
  }
}
