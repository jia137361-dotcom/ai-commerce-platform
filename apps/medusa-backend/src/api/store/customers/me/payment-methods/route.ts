import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { assertBuyerEmailVerified } from "../../../../../lib/buyer-auth-access"
import {
  createCustomerPaymentMethodSetupIntent,
  listCustomerPaymentMethodRecords,
} from "../../../../../lib/customer-payment-methods"
import { resolveCustomerId } from "../../../../../lib/customer-session"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const customerId = resolveCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Customer session is required" } })
  }

  try {
    const result = await listCustomerPaymentMethodRecords(req.scope, customerId)
    return res.json({
      stripe_configured: result.stripeConfigured,
      default_payment_method_id: result.defaultPaymentMethodId,
      payment_methods: result.paymentMethods,
      count: result.paymentMethods.length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load payment methods"
    return res.status(400).json({ error: { code: "PAYMENT_METHODS_ERROR", message } })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const customerId = resolveCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Customer session is required" } })
  }
  if (!(await assertBuyerEmailVerified(req, res, customerId))) return

  try {
    const setup = await createCustomerPaymentMethodSetupIntent(req.scope, customerId)
    return res.status(201).json({
      setup_intent_id: setup.setupIntentId,
      client_secret: setup.clientSecret,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start payment method setup"
    return res.status(400).json({ error: { code: "PAYMENT_METHOD_SETUP_ERROR", message } })
  }
}
