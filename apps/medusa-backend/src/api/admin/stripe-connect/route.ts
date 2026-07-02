import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../lib/store-context"
import {
  ensureSellerConnectOnboardingLink,
  formatStripeConnectSetupError,
  resolveSellerStripeConnectStatus,
} from "../../../lib/seller-stripe-connect"
import { isStripeConfigured } from "../../../lib/stripe-client"
import { retryPendingSellerPayoutsForStore } from "../../../lib/seller-order-payout"
import { getStoreCoreService, sendError } from "../../_helpers/store-core"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { store_id: storeId } = resolveCurrentStore(req)
  const storeCoreService = getStoreCoreService(req)
  const stores = await storeCoreService.listStores({ id: storeId })
  if (!stores.length) {
    return sendError(res, 404, "STORE_NOT_FOUND", "Store not found")
  }

  const store = stores[0] as { stripe_account_id?: string | null }
  const status = await resolveSellerStripeConnectStatus(store.stripe_account_id ?? null)

  return res.json({
    stripe_connect: status,
  })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  if (!isStripeConfigured()) {
    return sendError(
      res,
      503,
      "STRIPE_NOT_CONFIGURED",
      "Stripe is not configured on the server (STRIPE_API_KEY)."
    )
  }

  const { store_id: storeId } = resolveCurrentStore(req)
  const storeCoreService = getStoreCoreService(req)
  const stores = await storeCoreService.listStores({ id: storeId })
  if (!stores.length) {
    return sendError(res, 404, "STORE_NOT_FOUND", "Store not found")
  }

  const store = stores[0] as { stripe_account_id?: string | null }
  const settings = await storeCoreService.listStoreSettings({ store_id: storeId })
  const supportEmail =
    typeof settings[0]?.support_email === "string" ? settings[0].support_email : null

  try {
    const onboarding = await ensureSellerConnectOnboardingLink({
      storeId,
      stripeAccountId: store.stripe_account_id ?? null,
      supportEmail,
      persistAccountId: store.stripe_account_id
        ? undefined
        : async (accountId) => {
            const updated = await storeCoreService.updateStores({
              selector: { id: storeId },
              data: { stripe_account_id: accountId },
            })
            const saved = Array.isArray(updated) ? updated[0] : updated
            if (!saved?.id) {
              throw new Error("Stripe Connect account was created but could not be saved to the store record.")
            }
          },
    })

    return res.status(200).json({
      account_id: onboarding.account_id,
      onboarding_url: onboarding.onboarding_url,
    })
  } catch (error) {
    return sendError(
      res,
      502,
      "STRIPE_CONNECT_ONBOARDING_FAILED",
      formatStripeConnectSetupError(error)
    )
  }
}
