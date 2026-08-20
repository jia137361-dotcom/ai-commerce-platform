import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { listBuyerWithdrawalsForAdmin } from "../../../../lib/buyer-wallet"
import { resolveCurrentStore } from "../../../../lib/store-context"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const storeId = resolveCurrentStore(req).store_id
  const withdrawals = await listBuyerWithdrawalsForAdmin(req.scope, storeId)
  return res.json({ store_id: storeId, count: withdrawals.length, withdrawals })
}
