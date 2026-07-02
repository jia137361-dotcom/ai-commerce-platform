import { model } from "@medusajs/framework/utils"

const Supplier = model.define("mc_supplier", {
  id: model.id({ prefix: "sup" }).primaryKey(),
  code: model.text(),
  name: model.text(),
  country: model.text().nullable(),
  api_base_url: model.text().nullable(),
  test_api_base_url: model.text().nullable(),
  status: model.enum(["active", "inactive", "archived"]).default("active"),
  raw_json: model.json().nullable()
})

export default Supplier
