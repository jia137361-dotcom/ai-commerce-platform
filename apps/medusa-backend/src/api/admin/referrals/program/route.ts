import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getReferralProgram, updateReferralProgramSettings } from "../../../../lib/referral-program"
import { resolveCurrentStore } from "../../../../lib/store-context"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const storeId = resolveCurrentStore(req).store_id
  return res.json({ store_id: storeId, program: await getReferralProgram(req.scope, storeId) })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = (req.body ?? {}) as Record<string, unknown>
  try {
    const storeId = resolveCurrentStore(req).store_id
    const program = await updateReferralProgramSettings(req.scope, storeId, {
      firstOrderRatePercent: Number(body.first_order_rate_percent),
      futureOrderRatePercent: Number(body.future_order_rate_percent),
      attributionMonths: Number(body.future_order_months),
    })
    return res.json({ store_id: storeId, program })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update referral program"
    return res.status(400).json({ error: { code: "REFERRAL_PROGRAM_UPDATE_FAILED", message } })
  }
}
