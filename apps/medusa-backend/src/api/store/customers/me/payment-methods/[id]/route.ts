import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  detachCustomerPaymentMethod,
  setDefaultCustomerPaymentMethod,
} from "../../../../../../lib/customer-payment-methods"
import { resolveCustomerId } from "../../../../../../lib/customer-session"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const customerId = resolveCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Customer session is required" } })
  }

  const paymentMethodId = req.params.id
  if (!paymentMethodId) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Payment method id is required" } })
  }

  try {
    const result = await setDefaultCustomerPaymentMethod(req.scope, customerId, paymentMethodId)
    return res.json({
      default_payment_method_id: result.defaultPaymentMethodId,
      payment_methods: result.paymentMethods,
      count: result.paymentMethods.length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to set default payment method"
    return res.status(400).json({ error: { code: "PAYMENT_METHOD_DEFAULT_ERROR", message } })
  }
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const customerId = resolveCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Customer session is required" } })
  }

  const paymentMethodId = req.params.id
  if (!paymentMethodId) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Payment method id is required" } })
  }

  try {
    const result = await detachCustomerPaymentMethod(req.scope, customerId, paymentMethodId)
    return res.json({
      deleted: true,
      default_payment_method_id: result.defaultPaymentMethodId,
      payment_methods: result.paymentMethods,
      count: result.paymentMethods.length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to remove payment method"
    return res.status(400).json({ error: { code: "PAYMENT_METHOD_DELETE_ERROR", message } })
  }
}
