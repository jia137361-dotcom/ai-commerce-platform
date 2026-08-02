import type { ExecArgs } from "./medusa-exec-args"
import { ensurePayPalPaymentProvidersOnRegions } from "../lib/paypal-region-setup"

export default async function enablePayPalRegion({ container }: ExecArgs) {
  const result = await ensurePayPalPaymentProvidersOnRegions(container)
  if (!result.enabled) throw new Error(result.reason)
  for (const regionId of result.updated) console.log(`PAYPAL_REGION_ENABLED=${regionId}`)
  if (!result.updated.length) console.log("PAYPAL_REGION_ALREADY_ENABLED=all")
}
