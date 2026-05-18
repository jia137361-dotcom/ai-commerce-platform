import { model } from "@medusajs/framework/utils"

const SupplierProductVariant = model.define("mc_supplier_product_variant", {
  id: model.id({ prefix: "spv" }).primaryKey(),
  supplier_product_id: model.text(),
  supplier_variant_id: model.text(),
  color: model.text().nullable(),
  size: model.text().nullable(),
  sku: model.text(),
  cost: model.float().default(0),
  stock_status: model.enum(["in_stock", "out_of_stock", "unknown"]).default("in_stock"),
  raw_json: model.json().nullable()
})

export default SupplierProductVariant
