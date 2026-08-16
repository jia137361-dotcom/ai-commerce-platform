import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { assertBuyerEmailVerified } from "../../../../../../../lib/buyer-auth-access"
import { createPayPalVaultSetup } from "../../../../../../../lib/customer-payment-methods"
import { resolveCustomerId } from "../../../../../../../lib/customer-session"

const requestOrigin = (req: MedusaRequest) => {
  const origin = req.headers.origin
  return typeof origin === "string" ? origin : undefined
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const customerId = resolveCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Customer session is required" } })
  }
  if (!(await assertBuyerEmailVerified(req, res, customerId))) return

  try {
    const setup = await createPayPalVaultSetup(req.scope, customerId, requestOrigin(req))
    return res.status(201).json({
      setup_token_id: setup.setupTokenId,
      user_id_token: setup.userIdToken,
      merchant_id: setup.merchantId,
      approval_url: setup.approvalUrl,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start PayPal account authorization"
    return res.status(400).json({ error: { code: "PAYPAL_VAULT_SETUP_ERROR", message } })
  }
}
