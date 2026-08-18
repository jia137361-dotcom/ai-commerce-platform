import { model } from "@medusajs/framework/utils"

const ReferralAttribution = model.define("mc_referral_attribution", {
  id: model.id({ prefix: "rfa" }).primaryKey(),
  store_id: model.text(),
  referrer_customer_id: model.text(),
  referred_customer_id: model.text(),
  referral_code: model.text(),
  source: model.enum(["link", "code", "email", "admin"]).default("code"),
  status: model.enum(["active", "expired", "cancelled"]).default("active"),
  attributed_at: model.dateTime(),
  first_successful_order_id: model.text().nullable(),
  first_successful_order_at: model.dateTime().nullable(),
  expires_at: model.dateTime().nullable(),
  metadata: model.json().nullable(),
})

export default ReferralAttribution
