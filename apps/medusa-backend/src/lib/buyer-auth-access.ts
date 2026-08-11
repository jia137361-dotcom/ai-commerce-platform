import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { isEmailVerified } from "./email-verification"

export async function assertBuyerEmailVerified(
  req: MedusaRequest,
  res: MedusaResponse,
  customerId: string
) {
  const customerModule = req.scope.resolve(Modules.CUSTOMER) as {
    retrieveCustomer: (id: string) => Promise<{ metadata?: Record<string, unknown> | null }>
  }
  const customer = await customerModule.retrieveCustomer(customerId)
  if (isEmailVerified(customer.metadata)) return true
  res.status(403).json({
    error: {
      code: "EMAIL_NOT_VERIFIED",
      message: "Please verify your email before using this account feature.",
    },
  })
  return false
}
