import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../../lib/store-context"
import {
  resolveSellerStripeConnectStatus,
} from "../../../../lib/seller-stripe-connect"
import { retryPendingSellerPayoutsForStore, type SellerPayoutResult } from "../../../../lib/seller-order-payout"
import { getStoreCoreService, sendError } from "../../../_helpers/store-core"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { store_id: storeId } = resolveCurrentStore(req)
  const storeCoreService = getStoreCoreService(req)
  const stores = await storeCoreService.listStores({ id: storeId })
  if (!stores.length) {
    return sendError(res, 404, "STORE_NOT_FOUND", "Store not found")
  }

  const store = stores[0] as { stripe_account_id?: string | null }
  const status = await resolveSellerStripeConnectStatus(store.stripe_account_id ?? null)
  const retried = status.connected
    ? await retryPendingSellerPayoutsForStore(req.scope, storeId)
    : []

  return res.json({
    stripe_connect: status,
    retried_payout_count: retried.filter((result: SellerPayoutResult) => result.status === "completed").length,
    retried_payouts: retried,
  })
}
