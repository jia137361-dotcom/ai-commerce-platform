import { model } from "@medusajs/framework/utils"

const BuyerWalletWithdrawal = model.define("mc_buyer_wallet_withdrawal", {
  id: model.id({ prefix: "bww" }).primaryKey(),
  store_id: model.text(),
  customer_id: model.text(),
  request_id: model.text().nullable(),
  amount_minor: model.number(),
  currency_code: model.text(),
  paypal_email: model.text(),
  status: model.enum(["processing", "paid", "failed", "cancelled"]),
  provider: model.text().default("paypal"),
  provider_batch_id: model.text().nullable(),
  provider_item_id: model.text().nullable(),
  error_message: model.text().nullable(),
  metadata: model.json().nullable(),
})

export default BuyerWalletWithdrawal
