import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BuyerLoginOtpError, confirmBuyerLoginOtp } from "../../../../../lib/buyer-login-otp"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = (req.body ?? {}) as {
    email?: unknown
    code?: unknown
    password?: unknown
    remember_me?: unknown
    rememberMe?: unknown
  }
  try {
    const result = await confirmBuyerLoginOtp(req.scope, {
      email: body.email,
      code: body.code,
      password: body.password,
      rememberMe: body.remember_me ?? body.rememberMe,
    })
    return res.json({
      token: result.token,
      email: result.email,
      customer_id: result.customerId,
      remember_me: result.rememberMe,
      expires_in: result.expiresIn,
      password_set: result.passwordSet,
    })
  } catch (error) {
    if (error instanceof BuyerLoginOtpError) {
      return res.status(error.status).json({
        error: { code: error.code, message: error.message },
      })
    }
    return res.status(400).json({
      error: {
        code: "OTP_CONFIRM_ERROR",
        message: "Sign-in code is invalid or expired. Request a new code and try again.",
      },
    })
  }
}
