import type { ExecArgs } from "./medusa-exec-args"
import { ensureMarketRegions } from "../lib/product-regions"
import { ensureStripePaymentProvidersOnRegions } from "../lib/stripe-region-setup"

export default async function bootstrapMarketRegions({ container }: ExecArgs) {
  const regions = await ensureMarketRegions(container)
  for (const region of regions) {
    console.log(
      `MARKET_REGION=${region.region_id}:${region.name}:${region.currency_code}:${region.country_codes.join("|")}`
    )
  }

  const stripe = await ensureStripePaymentProvidersOnRegions(container)
  if (stripe.enabled) {
    console.log(`STRIPE_REGION_BOOTSTRAP=updated:${stripe.updated.join("|") || "none"}`)
  } else {
    console.log(`STRIPE_REGION_BOOTSTRAP=skipped:${stripe.reason}`)
  }
}
