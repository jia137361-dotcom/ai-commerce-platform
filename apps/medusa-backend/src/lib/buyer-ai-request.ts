import type { MedusaRequest } from "@medusajs/framework/http"
import { resolveCustomerId } from "./customer-session"
import {
  buildBuyerResourceOwnerPayload,
  type BuyerResourceOwnerFields,
} from "./buyer-resource-ownership"

type AuthenticatedRequest = MedusaRequest & {
  auth_context?: { actor_id?: string }
}

const readGuestKey = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null

export function resolveBuyerAiRequestOwner(req: MedusaRequest): BuyerResourceOwnerFields {
  const customerId = resolveCustomerId(req) ?? (req as AuthenticatedRequest).auth_context?.actor_id ?? null
  const guestKeyFromQuery = readGuestKey(req.query?.guest_key)
  const body =
    req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>) : null
  const guestKeyFromBody = readGuestKey(body?.guest_key)

  return buildBuyerResourceOwnerPayload({
    customerId: typeof customerId === "string" && customerId ? customerId : null,
    guestKey: guestKeyFromQuery ?? guestKeyFromBody,
  })
}
