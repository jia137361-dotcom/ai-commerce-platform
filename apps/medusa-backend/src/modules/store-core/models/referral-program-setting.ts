import { model } from "@medusajs/framework/utils"

const ReferralProgramSetting = model.define("mc_referral_program_setting", {
  id: model.id({ prefix: "rfps" }).primaryKey(),
  store_id: model.text(),
  first_order_rate_bps: model.number().default(2500),
  future_order_rate_bps: model.number().default(800),
  attribution_months: model.number().default(12),
  currency_code: model.text().default("usd"),
  metadata: model.json().nullable(),
})

export default ReferralProgramSetting
