/**
 * Pay a cart PaymentIntent with a saved Stripe payment method on the buyer account.
 *
 * POST /store/carts/:id/stripe/use-saved-payment-method
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { confirmCartWithSavedPaymentMethod } from "../../../../../../lib/confirm-cart-saved-payment-method"
import { resolveCustomerId } from "../../../../../../lib/customer-session"
import { CartStoreAccessError, CartStoreMismatchError } from "../../../../../../lib/cart-store-error"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const customerId = resolveCustomerId(req)
  if (!customerId) {
    return res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Sign in to use a saved payment method." },
    })
  }

  const cartId = req.params.id as string
  const body = (req.body ?? {}) as {
    payment_method_id?: string
    provider_id?: string
    return_url?: string
  }
  if (!body.payment_method_id?.trim()) {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "payment_method_id is required" },
    })
  }

  try {
    const result = await confirmCartWithSavedPaymentMethod(req.scope, {
      req,
      cartId,
      customerId,
      paymentMethodId: body.payment_method_id.trim(),
      providerId: body.provider_id,
      returnUrl: body.return_url,
    })
    return res.status(200).json(result)
  } catch (error) {
    if (error instanceof CartStoreMismatchError || error instanceof CartStoreAccessError) {
      return res.status(error instanceof CartStoreAccessError ? 403 : 400).json({
        error: { code: error.code, message: error.message },
      })
    }
    const message = error instanceof Error ? error.message : String(error)
    console.error("[stripe/use-saved-payment-method] failed:", message)
    return res.status(400).json({
      error: { code: "SAVED_PAYMENT_ERROR", message },
    })
  }
}
