import { model } from "@medusajs/framework/utils"

const Supplier = model.define("mc_supplier", {
  id: model.id({ prefix: "sup" }).primaryKey(),
  code: model.text(),
  name: model.text(),
  country: model.text().nullable(),
  ship_from_country: model.text().nullable(),
  ship_to_regions: model.json().nullable(),
  adapter_type: model.text().default("s2bdiy"),
  api_base_url: model.text().nullable(),
  test_api_base_url: model.text().nullable(),
  status: model.enum(["active", "inactive", "archived"]).default("active"),
  raw_json: model.json().nullable()
})

export default Supplier
