import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { grantBuyerCashback } from "../../../../lib/buyer-wallet"
import { resolveCurrentStore } from "../../../../lib/store-context"
import { isWalletCurrencySupported } from "../../../../lib/wallet-currency"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = (req.body ?? {}) as Record<string, unknown>
  const customerId = typeof body.customer_id === "string" ? body.customer_id.trim() : ""
  const amount = Number(body.amount)
  const currencyCode = typeof body.currency_code === "string" ? body.currency_code.trim().toLowerCase() : "hkd"
  if (!customerId || !Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "customer_id and an amount between 0 and 1,000,000 are required" } })
  }
  if (!isWalletCurrencySupported(currencyCode)) {
    return res.status(400).json({ error: { code: "UNSUPPORTED_CURRENCY", message: `Wallet currency ${currencyCode.toUpperCase()} is not supported` } })
  }
  try {
    const result = await grantBuyerCashback(req.scope, {
      storeId: resolveCurrentStore(req).store_id,
      customerId,
      amount,
      currencyCode,
      description: typeof body.description === "string" ? body.description : undefined,
      referenceId: typeof body.reference_id === "string" ? body.reference_id.trim() || undefined : undefined,
    })
    return res.status(result.idempotent ? 200 : 201).json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to grant cashback"
    return res.status(/not found/i.test(message) ? 404 : 400).json({ error: { code: "CASHBACK_GRANT_FAILED", message } })
  }
}
