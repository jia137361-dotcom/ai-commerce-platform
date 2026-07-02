import type { MedusaRequest } from "@medusajs/framework/http"

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
