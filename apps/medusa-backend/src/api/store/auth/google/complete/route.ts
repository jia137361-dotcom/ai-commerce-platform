import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BuyerGoogleAuthError, completeBuyerGoogleAuth } from "../../../../../lib/buyer-google-auth"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = (req.body ?? {}) as {
    remember_me?: unknown
    rememberMe?: unknown
  }
  try {
    const result = await completeBuyerGoogleAuth(req.scope, {
      authorizationHeader: req.headers.authorization,
      rememberMe: body.remember_me ?? body.rememberMe,
    })
    return res.json({
      token: result.token,
      email: result.email,
      customer_id: result.customerId,
      created: result.created,
      remember_me: result.rememberMe,
      expires_in: result.expiresIn,
    })
  } catch (error) {
    if (error instanceof BuyerGoogleAuthError) {
      return res.status(error.status).json({
        error: { code: error.code, message: error.message },
      })
    }
    return res.status(400).json({
      error: {
        code: "GOOGLE_COMPLETE_ERROR",
        message: "Unable to finish Google sign-in. Try again.",
      },
    })
  }
}
