import { model } from "@medusajs/framework/utils"

const BuyerWalletWithdrawal = model.define("mc_buyer_wallet_withdrawal", {
  id: model.id({ prefix: "bww" }).primaryKey(),
  store_id: model.text(),
  customer_id: model.text(),
  request_id: model.text().nullable(),
  amount_minor: model.number(),
  payout_amount_minor: model.number(),
  currency_code: model.text(),
  paypal_email: model.text(),
  status: model.enum(["pending", "approved", "processing", "paid", "failed", "rejected"]),
  provider: model.text().default("paypal"),
  provider_batch_id: model.text().nullable(),
  provider_item_id: model.text().nullable(),
  fee_minor: model.number().nullable(),
  provider_fee_minor: model.number().nullable(),
  failure_kind: model.enum(["platform", "recipient", "unknown"]).nullable(),
  retry_count: model.number().default(0),
  approved_at: model.dateTime().nullable(),
  processing_at: model.dateTime().nullable(),
  paid_at: model.dateTime().nullable(),
  rejected_at: model.dateTime().nullable(),
  error_message: model.text().nullable(),
  metadata: model.json().nullable(),
})

export default BuyerWalletWithdrawal
