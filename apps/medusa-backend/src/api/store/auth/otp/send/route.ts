import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BuyerLoginOtpError, sendBuyerLoginOtp } from "../../../../../lib/buyer-login-otp"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = (req.body ?? {}) as { email?: unknown }
  try {
    const result = await sendBuyerLoginOtp(req.scope, body.email)
    return res.json({
      sent: true,
      email: result.email,
      expires_at: result.expiresAt,
      ...(result.devCode ? { dev_code: result.devCode } : {}),
    })
  } catch (error) {
    if (error instanceof BuyerLoginOtpError) {
      return res.status(error.status).json({
        error: { code: error.code, message: error.message },
      })
    }
    return res.status(503).json({
      error: {
        code: "EMAIL_DELIVERY_ERROR",
        message: "We couldn't send the email right now. Please try again.",
      },
    })
  }
}
