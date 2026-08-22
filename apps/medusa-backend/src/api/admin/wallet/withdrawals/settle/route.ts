import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { processMonthlyBuyerWithdrawals } from "../../../../../lib/buyer-wallet"
import { resolveCurrentStore } from "../../../../../lib/store-context"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({
      error: {
        code: "FORCED_SETTLEMENT_DISABLED",
        message: "Forced wallet settlement is disabled in production",
      },
    })
  }

  try {
    const storeId = resolveCurrentStore(req).store_id
    const result = await processMonthlyBuyerWithdrawals(req.scope, { force: true, storeId })
    return res.json({ forced: true, store_id: storeId, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to force wallet settlement"
    return res.status(500).json({ error: { code: "SETTLEMENT_FAILED", message } })
  }
}
