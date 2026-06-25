import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import {
  confirmCustomerEmailVerification,
  readEmailVerificationStatus,
  sendCustomerEmailVerification,
} from "../../../../../lib/email-verification"
import { resolveCustomerId } from "../../../../../lib/customer-session"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const customerId = resolveCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Customer session is required" } })
  }

  const customerModule = req.scope.resolve(Modules.CUSTOMER)
  const customer = await customerModule.retrieveCustomer(customerId)
  return res.json({
    email: customer.email ?? null,
    ...readEmailVerificationStatus(customer.metadata as Record<string, unknown> | null),
  })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const customerId = resolveCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Customer session is required" } })
  }

  const body = (req.body ?? {}) as { action?: string; code?: string }
  const action = typeof body.action === "string" ? body.action.trim().toLowerCase() : ""

  try {
    if (action === "send") {
      const result = await sendCustomerEmailVerification(req.scope, customerId)
      return res.json({
        sent: true,
        email: result.email,
        expires_at: result.expiresAt,
        ...(result.devCode ? { dev_code: result.devCode } : {}),
      })
    }

    if (action === "confirm") {
      const code = typeof body.code === "string" ? body.code : ""
      const result = await confirmCustomerEmailVerification(req.scope, customerId, code)
      return res.json(result)
    }

    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "action must be send or confirm" },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process email verification"
    return res.status(400).json({ error: { code: "EMAIL_VERIFICATION_ERROR", message } })
  }
}
