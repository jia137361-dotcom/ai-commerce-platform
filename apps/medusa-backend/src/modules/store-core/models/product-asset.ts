import { model } from "@medusajs/framework/utils"

const ProductAsset = model.define("mc_product_asset", {
  id: model.id({ prefix: "pa" }).primaryKey(),
  store_id: model.text(),
  product_id: model.text(),
  ai_job_id: model.text().nullable(),
  supplier_id: model.text().nullable(),
  supplier_material_id: model.text().nullable(),
  supplier_material_name: model.text().nullable(),
  supplier_material_url: model.text().nullable(),
  asset_type: model.enum(["design", "print_file", "supplier_material", "supplier_mockup"]),
  url: model.text().nullable(),
  file_format: model.text().nullable(),
  width: model.number().nullable(),
  height: model.number().nullable(),
  dpi: model.number().nullable(),
  view_id: model.text().nullable(),
  design_type: model.number().nullable(),
  metadata_json: model.json().nullable(),
})

export default ProductAsset
