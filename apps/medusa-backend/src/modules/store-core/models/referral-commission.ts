import { model } from "@medusajs/framework/utils"

const ReferralCommission = model.define("mc_referral_commission", {
  id: model.id({ prefix: "rfc" }).primaryKey(),
  store_id: model.text(),
  attribution_id: model.text(),
  referrer_customer_id: model.text(),
  referred_customer_id: model.text(),
  order_id: model.text(),
  order_display_id: model.number().nullable(),
  order_created_at: model.dateTime(),
  eligible_amount_minor: model.number(),
  commission_amount_minor: model.number(),
  currency_code: model.text().default("usd"),
  rate_bps: model.number(),
  is_first_order: model.boolean().default(false),
  status: model.enum([
    "pending",
    "released",
    "order_cancelled",
    "order_refund",
    "cancelled",
    "frozen",
    "reversed",
    "expired",
  ]).default("pending"),
  released_at: model.dateTime().nullable(),
  reason: model.text().nullable(),
  metadata: model.json().nullable(),
})

export default ReferralCommission
