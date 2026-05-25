import { model } from "@medusajs/framework/utils"

const Product = model.define("mc_product", {
  id: model.id({ prefix: "prod" }).primaryKey(),
  store_id: model.text(),
  title: model.text(),
  description: model.text().nullable(),
  status: model.enum(["draft", "published", "unpublished", "archived"]).default("draft"),
  source: model.enum(["manual", "ai"]).default("manual"),
  ai_job_id: model.text().nullable(),
  prompt: model.text().nullable(),
  supplier_id: model.text().nullable(),
  platform_product_id: model.text().nullable(),
  basic_product_id: model.text().nullable(),
  supplier_product_id: model.text().nullable(),
  supplier_variant_id: model.text().nullable(),
  supplier_material_id: model.text().nullable(),
  supplier_size_id: model.text().nullable(),
  supplier_color_id: model.text().nullable(),
  view_id: model.text().nullable(),
  design_type: model.number().default(1),
  medusa_product_id: model.text().nullable(),
  medusa_variant_id: model.text().nullable(),
  design_image_url: model.text().nullable(),
  mockup_image_url: model.text().nullable(),
  print_file_url: model.text().nullable(),
  image_url: model.text().nullable(),
  tags: model.array().nullable(),
  price: model.float().nullable(),
  cost: model.float().nullable(),
  variants: model.json().nullable(),
  category_ids: model.array().nullable(),
  metadata: model.json().nullable()
})

export default Product
