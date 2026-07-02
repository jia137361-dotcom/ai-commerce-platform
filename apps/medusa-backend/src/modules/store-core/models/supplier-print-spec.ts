import { model } from "@medusajs/framework/utils"

const SupplierPrintSpec = model.define("mc_supplier_print_spec", {
  id: model.id({ prefix: "sps" }).primaryKey(),
  supplier_product_id: model.text(),
  supplier_variant_id: model.text().nullable(),
  basic_product_id: model.text().nullable(),
  view_id: model.text().nullable(),
  view_name: model.text().nullable(),
  view_en_name: model.text().nullable(),
  print_position: model.text(),
  print_file_width: model.number(),
  print_file_height: model.number(),
  dpi: model.number(),
  design_area_width: model.number().nullable(),
  design_area_height: model.number().nullable(),
  design_area_unit: model.text().default("px"),
  design_type: model.number().default(1),
  tip_level: model.text().nullable(),
  accepted_formats: model.array().nullable(),
  background_required: model.boolean().default(false),
  safe_margin: model.number().nullable(),
  bleed: model.number().nullable(),
  color_mode: model.text().default("RGB"),
  status: model.enum(["active", "inactive", "archived"]).default("active")
})

export default SupplierPrintSpec
