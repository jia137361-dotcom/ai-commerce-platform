import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { updateReferralCommissionByAdmin } from "../../../../../../lib/referral-program"
import { resolveCurrentStore } from "../../../../../../lib/store-context"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = (req.body ?? {}) as Record<string, unknown>
  const action = String(body.action ?? "")
  if (!["freeze", "unfreeze", "cancel", "release", "adjust"].includes(action)) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "A valid commission action is required" } })
  }
  try {
    const commission = await updateReferralCommissionByAdmin(req.scope, {
      storeId: resolveCurrentStore(req).store_id,
      commissionId: String(req.params.id),
      action: action as "freeze" | "unfreeze" | "cancel" | "release" | "adjust",
      amount: body.amount == null ? undefined : Number(body.amount),
      reason: typeof body.reason === "string" ? body.reason : undefined,
    })
    return res.json({ commission })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update commission"
    return res.status(/not found/i.test(message) ? 404 : 409).json({ error: { code: "REFERRAL_COMMISSION_UPDATE_FAILED", message } })
  }
}
