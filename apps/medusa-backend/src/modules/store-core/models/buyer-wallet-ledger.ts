import { model } from "@medusajs/framework/utils"

const BuyerWalletLedger = model.define("mc_buyer_wallet_ledger", {
  id: model.id({ prefix: "bwl" }).primaryKey(),
  store_id: model.text(),
  customer_id: model.text(),
  type: model.enum(["cashback_credit", "withdrawal_debit", "adjustment"]),
  amount_minor: model.number(),
  currency_code: model.text(),
  status: model.enum(["available", "processing", "completed", "failed", "cancelled"]),
  source: model.text().nullable(),
  reference_id: model.text().nullable(),
  description: model.text().nullable(),
  metadata: model.json().nullable(),
})

export default BuyerWalletLedger
