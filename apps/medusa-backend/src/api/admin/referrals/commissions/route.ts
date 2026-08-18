import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { listReferralCommissionsForAdmin } from "../../../../lib/referral-program"
import { resolveCurrentStore } from "../../../../lib/store-context"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const storeId = resolveCurrentStore(req).store_id
  const commissions = await listReferralCommissionsForAdmin(req.scope, storeId)
  return res.json({ store_id: storeId, count: commissions.length, commissions })
}
