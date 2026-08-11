import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { isGoogleOAuthConfigured, resolveOAuthCallbackUrl } from "../../../../../lib/oauth-actor"

export const GET = async (_req: MedusaRequest, res: MedusaResponse) => {
  const enabled = isGoogleOAuthConfigured()
  return res.json({
    enabled,
    provider: "google",
    actor: "buyer",
    callback_url: enabled ? resolveOAuthCallbackUrl("buyer") : null,
  })
}
