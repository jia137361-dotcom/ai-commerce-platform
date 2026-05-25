import { model } from "@medusajs/framework/utils"

const SupplierProduct = model.define("mc_supplier_product", {
  id: model.id({ prefix: "sp" }).primaryKey(),
  supplier_id: model.text(),
  supplier_product_id: model.text(),
  platform_product_id: model.text(),
  name: model.text(),
  category: model.text(),
  base_cost: model.float().default(0),
  currency: model.text().default("usd"),
  status: model.enum(["active", "inactive", "archived"]).default("active"),
  raw_json: model.json().nullable()
})

export default SupplierProduct
