import { model } from "@medusajs/framework/utils"

const BuyerRefundRequest = model.define("buyer_refund_request", {
  id: model.id({ prefix: "brr" }).primaryKey(),
  order_id: model.text(),
  display_id: model.number().nullable(),
  customer_id: model.text(),
  store_id: model.text(),
  currency_code: model.text(),
  requested_amount: model.bigNumber(),
  approved_amount: model.bigNumber().nullable(),
  reason: model.text(),
  note: model.text().nullable(),
  status: model
    .enum(["pending", "approved", "rejected", "processing", "processed", "failed", "cancelled"])
    .default("pending"),
  payment_provider_id: model.text().nullable(),
  external_payment_id: model.text().nullable(),
  external_refund_id: model.text().nullable(),
  external_transaction_id: model.text().nullable(),
  provider_status: model.text().nullable(),
  provider_payload: model.json().nullable(),
  reviewed_at: model.dateTime().nullable(),
  processed_at: model.dateTime().nullable(),
  failed_at: model.dateTime().nullable(),
  failure_reason: model.text().nullable(),
  metadata: model.json().nullable(),
})

export default BuyerRefundRequest
