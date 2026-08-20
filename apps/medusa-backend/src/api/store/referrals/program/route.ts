import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getReferralProgram } from "../../../../lib/referral-program"
import { resolveCurrentStore } from "../../../../lib/store-context"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const program = await getReferralProgram(req.scope, resolveCurrentStore(req).store_id)
  return res.json({ program })
}
