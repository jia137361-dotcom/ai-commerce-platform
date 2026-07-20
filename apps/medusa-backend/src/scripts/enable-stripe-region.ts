import type { ExecArgs } from "./medusa-exec-args"
import { ensureStripePaymentProvidersOnRegions } from "../lib/stripe-region-setup"

export default async function enableStripeRegion({ container }: ExecArgs) {
  const result = await ensureStripePaymentProvidersOnRegions(container)
  if (!result.enabled) {
    throw new Error(result.reason)
  }
  for (const regionId of result.updated) {
    console.log(`STRIPE_REGION_ENABLED=${regionId}`)
  }
  if (!result.updated.length) {
    console.log("STRIPE_REGION_ALREADY_ENABLED=all")
  }
}
