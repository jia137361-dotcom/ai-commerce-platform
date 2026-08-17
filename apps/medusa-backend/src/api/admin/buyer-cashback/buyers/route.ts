import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { listCashbackBuyers } from "../../../../lib/buyer-wallet"
import { resolveCurrentStore } from "../../../../lib/store-context"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const storeId = resolveCurrentStore(req).store_id
  const query = typeof req.query?.q === "string" ? req.query.q : ""
  const buyers = await listCashbackBuyers(req.scope, storeId, query)
  return res.json({ store_id: storeId, count: buyers.length, buyers })
}
