import { model } from "@medusajs/framework/utils"

const PlatformProduct = model.define("mc_platform_product", {
  id: model.id({ prefix: "pp" }).primaryKey(),
  title: model.text(),
  category: model.text(),
  description: model.text().nullable(),
  base_cost: model.float().default(0),
  supplier: model.text().nullable(),
  supplier_product_id: model.text().nullable(),
  available_colors: model.array().nullable(),
  available_sizes: model.array().nullable(),
  print_area: model.json().nullable(),
  status: model.enum(["active", "inactive", "archived"]).default("active")
})

export default PlatformProduct

