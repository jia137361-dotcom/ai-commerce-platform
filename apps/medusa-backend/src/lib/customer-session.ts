import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { isPlatformDisabled } from "./platform-admin/require-platform-operator"

export type AuthenticatedCustomerRequest = MedusaRequest & {
  auth_context?: {
    actor_id?: string
  }
}

export const resolveCustomerId = (req: MedusaRequest): string | null => {
  const customerId = (req as AuthenticatedCustomerRequest).auth_context?.actor_id
  return typeof customerId === "string" && customerId.length > 0 ? customerId : null
}

export const requireCustomerId = (req: MedusaRequest): string | null => {
  return resolveCustomerId(req)
}

export async function assertActiveCustomer(
  req: MedusaRequest,
  res: MedusaResponse,
  customerId: string
): Promise<boolean> {
  const customerModule = req.scope.resolve(Modules.CUSTOMER) as {
    retrieveCustomer: (id: string) => Promise<{ id: string; metadata?: Record<string, unknown> | null }>
  }
  try {
    const customer = await customerModule.retrieveCustomer(customerId)
    if (isPlatformDisabled(customer.metadata)) {
      res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Buyer account is disabled by platform operations",
        },
      })
      return false
    }
    return true
  } catch {
    return true
  }
}
