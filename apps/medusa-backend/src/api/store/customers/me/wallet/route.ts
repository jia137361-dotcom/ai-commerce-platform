import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getBuyerWallet } from "../../../../../lib/buyer-wallet"
import { resolveCustomerId } from "../../../../../lib/customer-session"
import { resolveCurrentStore } from "../../../../../lib/store-context"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const customerId = resolveCustomerId(req)
  if (!customerId) return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Customer session is required" } })
  try {
    const wallet = await getBuyerWallet(req.scope, resolveCurrentStore(req).store_id, customerId)
    return res.json({ wallet })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load wallet"
    return res.status(400).json({ error: { code: "WALLET_LOAD_FAILED", message } })
  }
}
