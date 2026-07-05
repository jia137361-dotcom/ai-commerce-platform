import { model } from "@medusajs/framework/utils"

const WarehouseRegion = model.define("mc_warehouse_region", {
  id: model.id({ prefix: "wr" }).primaryKey(),
  code: model.text(),
  name_en: model.text(),
  name_zh: model.text(),
  country_code: model.text().nullable(),
  s2bdiy_count: model.number().nullable(),
  enabled: model.boolean().default(true),
  notes: model.text().nullable(),
  sort_order: model.number().default(0),
  raw_json: model.json().nullable()
})

export default WarehouseRegion
