import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { assertBuyerEmailVerified } from "../../../../../../lib/buyer-auth-access"
import { requestBuyerWithdrawal } from "../../../../../../lib/buyer-wallet"
import { resolveCustomerId } from "../../../../../../lib/customer-session"
import { resolveCurrentStore } from "../../../../../../lib/store-context"
import { isWalletCurrencySupported } from "../../../../../../lib/wallet-currency"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const customerId = resolveCustomerId(req)
  if (!customerId) return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Customer session is required" } })
  if (!(await assertBuyerEmailVerified(req, res, customerId))) return
  const body = (req.body ?? {}) as Record<string, unknown>
  const amount = Number(body.amount)
  const currencyCode = typeof body.currency_code === "string" ? body.currency_code.trim().toLowerCase() : "usd"
  const requestId = typeof body.request_id === "string" ? body.request_id.trim() : ""
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "A withdrawal amount between 0 and 1,000,000 is required" } })
  }
  if (!isWalletCurrencySupported(currencyCode)) {
    return res.status(400).json({ error: { code: "UNSUPPORTED_CURRENCY", message: `Wallet currency ${currencyCode.toUpperCase()} is not supported` } })
  }
  if (!/^[A-Za-z0-9_-]{8,100}$/.test(requestId)) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "A valid request_id is required" } })
  }
  try {
    const result = await requestBuyerWithdrawal(req.scope, {
      storeId: resolveCurrentStore(req).store_id,
      customerId,
      amount,
      currencyCode,
      requestId,
    })
    return res.status(result.idempotent ? 200 : 201).json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create withdrawal"
    const status = /not enabled/i.test(message) ? 503 : 400
    return res.status(status).json({ error: { code: "WITHDRAWAL_FAILED", message } })
  }
}
