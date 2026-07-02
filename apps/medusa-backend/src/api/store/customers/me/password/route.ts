import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

type AuthenticatedRequest = MedusaRequest & { auth_context?: { actor_id?: string } }

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const customerId = (req as AuthenticatedRequest).auth_context?.actor_id
  if (!customerId) return res.status(401).json({ error: "Customer session is required" })

  const body = (req.body ?? {}) as { current_password?: unknown; new_password?: unknown }
  const currentPassword = typeof body.current_password === "string" ? body.current_password : ""
  const newPassword = typeof body.new_password === "string" ? body.new_password : ""
  if (!currentPassword || newPassword.length < 8) {
    return res.status(400).json({ error: "Current password and a new password of at least 8 characters are required" })
  }

  const customerModule = req.scope.resolve(Modules.CUSTOMER)
  const customer = await customerModule.retrieveCustomer(customerId)
  if (!customer.email) return res.status(409).json({ error: "This account has no email password identity" })

  const authModule = req.scope.resolve(Modules.AUTH) as unknown as {
    authenticate: (provider: string, data: Record<string, unknown>) => Promise<{ success: boolean; authIdentity?: { app_metadata?: Record<string, unknown> | null } }>
    updateProvider: (provider: string, data: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>
  }
  const verified = await authModule.authenticate("emailpass", {
    body: { email: customer.email, password: currentPassword },
  })
  if (!verified.success || verified.authIdentity?.app_metadata?.customer_id !== customerId) {
    return res.status(403).json({ error: "Current password is incorrect" })
  }

  const updated = await authModule.updateProvider("emailpass", {
    entity_id: customer.email,
    password: newPassword,
  })
  if (!updated.success) return res.status(400).json({ error: updated.error ?? "Unable to change password" })
  return res.json({ updated: true })
}
