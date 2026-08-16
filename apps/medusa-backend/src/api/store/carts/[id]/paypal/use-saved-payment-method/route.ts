import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CartStoreAccessError, CartStoreMismatchError } from "../../../../../../lib/cart-store-error"
import { resolveCustomerId } from "../../../../../../lib/customer-session"
import { prepareCartWithSavedPayPalPaymentMethod } from "../../../../../../lib/prepare-cart-saved-paypal-payment-method"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const customerId = resolveCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Sign in to use a saved PayPal account." } })
  }
  const body = (req.body ?? {}) as { payment_method_id?: string; provider_id?: string }
  if (!body.payment_method_id?.trim()) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "payment_method_id is required" } })
  }

  try {
    const result = await prepareCartWithSavedPayPalPaymentMethod(req.scope, {
      req,
      cartId: req.params.id as string,
      customerId,
      paymentMethodId: body.payment_method_id.trim(),
      providerId: body.provider_id,
    })
    return res.status(200).json({
      provider_id: result.providerId,
      payment_method_id: body.payment_method_id.trim(),
      payment_method_label: result.paymentMethodLabel,
    })
  } catch (error) {
    if (error instanceof CartStoreMismatchError || error instanceof CartStoreAccessError) {
      return res.status(error instanceof CartStoreAccessError ? 403 : 400).json({
        error: { code: error.code, message: error.message },
      })
    }
    const message = error instanceof Error ? error.message : String(error)
    console.error("[paypal/use-saved-payment-method] failed:", message)
    return res.status(400).json({ error: { code: "SAVED_PAYPAL_PAYMENT_ERROR", message } })
  }
}
