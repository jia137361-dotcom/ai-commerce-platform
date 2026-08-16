import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { assertBuyerEmailVerified } from "../../../../../../../lib/buyer-auth-access"
import { completePayPalVaultSetup } from "../../../../../../../lib/customer-payment-methods"
import { resolveCustomerId } from "../../../../../../../lib/customer-session"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const customerId = resolveCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Customer session is required" } })
  }
  if (!(await assertBuyerEmailVerified(req, res, customerId))) return

  const body = (req.body ?? {}) as { setup_token_id?: unknown }
  const setupTokenId = typeof body.setup_token_id === "string" ? body.setup_token_id.trim() : ""
  if (!setupTokenId) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "setup_token_id is required" } })
  }

  try {
    const result = await completePayPalVaultSetup(req.scope, customerId, setupTokenId)
    return res.status(201).json({
      stripe_configured: result.stripeConfigured,
      paypal_vault_configured: result.paypalVaultConfigured,
      default_payment_method_id: result.defaultPaymentMethodId,
      payment_methods: result.paymentMethods,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save PayPal account"
    return res.status(400).json({ error: { code: "PAYPAL_VAULT_COMPLETE_ERROR", message } })
  }
}
