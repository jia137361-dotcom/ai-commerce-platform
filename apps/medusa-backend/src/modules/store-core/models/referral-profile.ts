import { model } from "@medusajs/framework/utils"

const ReferralProfile = model.define("mc_referral_profile", {
  id: model.id({ prefix: "rfp" }).primaryKey(),
  store_id: model.text(),
  customer_id: model.text(),
  referral_code: model.text(),
  status: model.enum(["active", "frozen"]).default("active"),
  metadata: model.json().nullable(),
})

export default ReferralProfile
