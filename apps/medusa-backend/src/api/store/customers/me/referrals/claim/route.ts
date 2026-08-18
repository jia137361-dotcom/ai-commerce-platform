import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { bindReferralCode } from "../../../../../../lib/referral-program"
import { resolveCustomerId } from "../../../../../../lib/customer-session"
import { resolveCurrentStore } from "../../../../../../lib/store-context"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const customerId = resolveCustomerId(req)
  if (!customerId) return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Customer session is required" } })
  const body = (req.body ?? {}) as Record<string, unknown>
  const referralCode = typeof body.referral_code === "string" ? body.referral_code : ""
  const source = ["link", "code", "email"].includes(String(body.source))
    ? String(body.source) as "link" | "code" | "email"
    : "code"
  try {
    const result = await bindReferralCode(req.scope, {
      storeId: resolveCurrentStore(req).store_id,
      referredCustomerId: customerId,
      referralCode,
      source,
    })
    return res.status(result.idempotent ? 200 : 201).json({
      attribution: {
        id: result.attribution.id,
        referral_code: result.attribution.referral_code,
        status: result.attribution.status,
        attributed_at: result.attribution.attributed_at,
      },
      idempotent: result.idempotent,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to apply referral code"
    return res.status(/not found/i.test(message) ? 404 : 409).json({ error: { code: "REFERRAL_CLAIM_FAILED", message } })
  }
}
