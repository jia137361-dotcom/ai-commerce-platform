import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ensureMarketRegions } from "../../../lib/product-regions"
import { ensurePayPalPaymentProvidersOnRegions } from "../../../lib/paypal-region-setup"
import { ensureStripePaymentProvidersOnRegions } from "../../../lib/stripe-region-setup"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const regions = await ensureMarketRegions(req.scope)
  // Provider synchronization must never prevent the catalog from loading.
  // Execute sequentially so each update preserves providers added by the other.
  try {
    await ensureStripePaymentProvidersOnRegions(req.scope)
  } catch (error) {
    console.warn("[market-regions] unable to synchronize Stripe providers", error)
  }
  try {
    await ensurePayPalPaymentProvidersOnRegions(req.scope)
  } catch (error) {
    console.warn("[market-regions] unable to synchronize PayPal providers", error)
  }
  return res.json({
    count: regions.length,
    regions,
  })
}
