import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolvePlatformPayPalBusinessStatus } from "../../../lib/platform-paypal-business"

export const GET = async (_req: MedusaRequest, res: MedusaResponse) => {
  return res.json({ paypal_business: resolvePlatformPayPalBusinessStatus() })
}
