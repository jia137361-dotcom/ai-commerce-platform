import { model } from "@medusajs/framework/utils"

const SupplierPrintSpec = model.define("mc_supplier_print_spec", {
  id: model.id({ prefix: "sps" }).primaryKey(),
  supplier_product_id: model.text(),
  supplier_variant_id: model.text().nullable(),
  print_position: model.text(),
  print_file_width: model.number(),
  print_file_height: model.number(),
  dpi: model.number(),
  accepted_formats: model.array().nullable(),
  background_required: model.boolean().default(false),
  safe_margin: model.number().nullable(),
  bleed: model.number().nullable(),
  color_mode: model.text().default("RGB"),
  status: model.enum(["active", "inactive", "archived"]).default("active")
})

export default SupplierPrintSpec
