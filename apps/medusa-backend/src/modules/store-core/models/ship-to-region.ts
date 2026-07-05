import { model } from "@medusajs/framework/utils"

const ShipToRegion = model.define("mc_ship_to_region", {
  id: model.id({ prefix: "str" }).primaryKey(),
  zone: model.text(),
  country_region_en: model.text(),
  country_region_zh: model.text(),
  country_code: model.text(),
  phone_code: model.text().nullable(),
  abbreviation: model.text(),
  enabled: model.boolean().default(true),
  blocked: model.boolean().default(false),
  blocked_reason: model.text().nullable(),
  sort_order: model.number().default(0),
  raw_json: model.json().nullable()
})

export default ShipToRegion
