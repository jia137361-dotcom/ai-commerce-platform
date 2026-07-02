import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { GET as getOrderDetail } from "../../../../orders/[id]/detail/route"

type AuthenticatedRequest = MedusaRequest & {
  auth_context?: { actor_id?: string }
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const actorId = (req as AuthenticatedRequest).auth_context?.actor_id
  if (!actorId) {
    return res.status(401).json({
      error: {
        code: "ORDER_ACCESS_DENIED",
        message: "Customer session is required.",
      },
    })
  }
  return getOrderDetail(req, res)
}
