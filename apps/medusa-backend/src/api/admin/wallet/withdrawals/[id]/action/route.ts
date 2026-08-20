import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { updateBuyerWithdrawalByAdmin } from "../../../../../../lib/buyer-wallet"
import { resolveCurrentStore } from "../../../../../../lib/store-context"

const ACTIONS = new Set(["approve", "reject", "retry"])

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = (req.body ?? {}) as Record<string, unknown>
  const action = typeof body.action === "string" ? body.action.trim().toLowerCase() : ""
  if (!ACTIONS.has(action)) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "A valid withdrawal action is required" } })
  }
  try {
    const storeId = resolveCurrentStore(req).store_id
    const withdrawal = await updateBuyerWithdrawalByAdmin(req.scope, {
      storeId,
      withdrawalId: String(req.params.id),
      action: action as "approve" | "reject" | "retry",
      reason: typeof body.reason === "string" ? body.reason : undefined,
    })
    return res.json({ withdrawal })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update withdrawal"
    return res.status(/not found/i.test(message) ? 404 : 400).json({ error: { code: "WITHDRAWAL_ACTION_FAILED", message } })
  }
}
